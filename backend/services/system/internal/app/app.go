// Package app holds the system service's use cases.
package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

var (
	// ErrUnknownModule means the key is not a module in the catalogue.
	ErrUnknownModule = errors.New("unknown module")
	// ErrUnknownIntegration means the requested provider is not found.
	ErrUnknownIntegration = errors.New("unknown integration")
	// ErrValidationFailed means an input failed validation.
	ErrValidationFailed = errors.New("validation failed")
)

// Module is a catalogue module with its current state.
type Module struct {
	catalog.Module
	Enabled   bool
	UpdatedBy *string
	UpdatedAt *time.Time
}

// SecretHint tells the caller whether a secret is set and its last characters.
type SecretHint struct {
	Set  bool   `json:"set"`
	Hint string `json:"hint"`
}

// DeskIntegration is the view returned to the IT desk.
type DeskIntegration struct {
	Provider      string                `json:"provider"`
	IsActive      bool                  `json:"isActive"`
	HealthStatus  string                `json:"healthStatus"`
	AccountName   *string               `json:"accountName"`
	LastError     *string               `json:"lastError"`
	LastCheckedAt *time.Time            `json:"lastCheckedAt"`
	LastSyncedAt  *time.Time            `json:"lastSyncedAt"`
	Values        map[string]string     `json:"values"`
	Secrets       map[string]SecretHint `json:"secrets"`
	Config        map[string]any        `json:"config"`
	UpdatedBy     *string               `json:"updatedBy,omitempty"`
	UpdatedAt     *time.Time            `json:"updatedAt,omitempty"`
}

// ServiceIntegration is the view returned to backend services with decrypted credentials.
type ServiceIntegration struct {
	Provider      string            `json:"provider"`
	IsActive      bool              `json:"isActive"`
	HealthStatus  string            `json:"healthStatus"`
	AccountName   *string           `json:"accountName"`
	LastError     *string           `json:"lastError"`
	LastCheckedAt *time.Time        `json:"lastCheckedAt"`
	LastSyncedAt  *time.Time        `json:"lastSyncedAt"`
	Credentials   map[string]string `json:"credentials"`
	Config        map[string]any    `json:"config"`
	UpdatedBy     *string           `json:"updatedBy,omitempty"`
	UpdatedAt     *time.Time        `json:"updatedAt,omitempty"`
}

// SaveIntegrationInput holds fields to save an integration.
type SaveIntegrationInput struct {
	IsActive bool              `json:"isActive"`
	Values   map[string]string `json:"values"`
	Config   map[string]any    `json:"config"`
}

// UpdateIntegrationStatusInput updates an integration's health or sync metadata.
type UpdateIntegrationStatusInput struct {
	HealthStatus         *string           `json:"healthStatus"`
	LastError            *string           `json:"lastError"`
	AccountName          *string           `json:"accountName"`
	LastCheckedAt        *time.Time        `json:"lastCheckedAt"`
	LastSyncedAt         *time.Time        `json:"lastSyncedAt"`
	Config               map[string]any    `json:"config"`
	RefreshedCredentials map[string]string `json:"refreshedCredentials"`
	SyncLeaseToken       *string           `json:"syncLeaseToken"`
	SyncLeaseUntil       *time.Time        `json:"syncLeaseUntil"`
}

// Service implements the use cases.
type Service struct {
	store   *postgres.Store
	keyring *secrets.Keyring
	now     func() time.Time
}

// New returns the service.
func New(store *postgres.Store, keyring *secrets.Keyring) *Service {
	return &Service{store: store, keyring: keyring, now: func() time.Time { return time.Now().UTC() }}
}

// Modules returns every catalogue module, in catalogue order. One nobody switched follows its default.
func (s *Service) Modules(ctx context.Context) ([]Module, error) {
	stored, err := s.store.ModuleSettings(ctx)
	if err != nil {
		return nil, err
	}
	byKey := make(map[string]postgres.ModuleSetting, len(stored))
	for _, m := range stored {
		byKey[m.ModuleKey] = m
	}
	out := make([]Module, len(catalog.Modules))
	for i, m := range catalog.Modules {
		out[i] = Module{Module: m, Enabled: m.EnabledByDefault}
		if saved, ok := byKey[m.Key]; ok {
			at := saved.UpdatedAt
			out[i].Enabled, out[i].UpdatedBy, out[i].UpdatedAt = saved.Enabled, saved.UpdatedBy, &at
		}
	}
	return out, nil
}

// SetModule switches a catalogue module on or off; by names who did it (a person, or a service's setup step).
func (s *Service) SetModule(ctx context.Context, key string, enabled bool, by string) error {
	for _, m := range catalog.Modules {
		if m.Key == key {
			return s.store.SetModule(ctx, key, enabled, by, s.now())
		}
	}
	return ErrUnknownModule
}

// SecretHintFor returns a masked hint for a secret value (e.g. "…1234").
func SecretHintFor(value string) string {
	if len(value) > 8 {
		return "…" + value[len(value)-4:]
	}
	return ""
}

func (s *Service) decryptCredentials(provider string, ciphertext *string) map[string]string {
	if ciphertext == nil || *ciphertext == "" || s.keyring == nil {
		return map[string]string{}
	}
	plain, err := s.keyring.Open(*ciphertext, "integration:"+provider)
	if err != nil {
		return map[string]string{}
	}
	var out map[string]string
	if err := json.Unmarshal(plain, &out); err != nil {
		return map[string]string{}
	}
	return out
}

func parseJSONMap(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return map[string]any{}
	}
	if out == nil {
		return map[string]any{}
	}
	return out
}

// DeskIntegrations returns every catalogue integration with masked secrets, in catalogue order.
func (s *Service) DeskIntegrations(ctx context.Context) ([]DeskIntegration, error) {
	stored, err := s.store.IntegrationSettings(ctx)
	if err != nil {
		return nil, err
	}
	byProvider := make(map[string]postgres.IntegrationSetting, len(stored))
	for _, item := range stored {
		byProvider[item.Provider] = item
	}
	out := make([]DeskIntegration, len(catalog.Integrations.Providers))
	for i, p := range catalog.Integrations.Providers {
		record, exists := byProvider[p.ID]
		creds := map[string]string{}
		if exists {
			creds = s.decryptCredentials(p.ID, record.Credentials)
		}
		values := make(map[string]string)
		sec := make(map[string]SecretHint)
		for _, f := range p.Fields {
			val := creds[f.Key]
			if f.Secret {
				sec[f.Key] = SecretHint{Set: val != "", Hint: SecretHintFor(val)}
			} else {
				values[f.Key] = val
			}
		}
		status := "unknown"
		if exists {
			status = record.HealthStatus
			if status == "healthy" && p.Kind == "sign_in" {
				status = "configured"
			}
		}
		out[i] = DeskIntegration{
			Provider:     p.ID,
			IsActive:     exists && record.IsActive,
			HealthStatus: status,
			Values:       values,
			Secrets:      sec,
			Config:       parseJSONMap(record.Config),
		}
		if exists {
			out[i].AccountName = record.AccountName
			out[i].LastError = record.LastError
			out[i].LastCheckedAt = record.LastCheckedAt
			out[i].LastSyncedAt = record.LastSyncedAt
			out[i].UpdatedBy = record.UpdatedBy
			at := record.UpdatedAt
			out[i].UpdatedAt = &at
		}
	}
	return out, nil
}

// ServiceIntegrations returns every stored integration with decrypted credentials.
func (s *Service) ServiceIntegrations(ctx context.Context) ([]ServiceIntegration, error) {
	stored, err := s.store.IntegrationSettings(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ServiceIntegration, len(stored))
	for i, record := range stored {
		at := record.UpdatedAt
		out[i] = ServiceIntegration{
			Provider:      record.Provider,
			IsActive:      record.IsActive,
			HealthStatus:  record.HealthStatus,
			AccountName:   record.AccountName,
			LastError:     record.LastError,
			LastCheckedAt: record.LastCheckedAt,
			LastSyncedAt:  record.LastSyncedAt,
			Credentials:   s.decryptCredentials(record.Provider, record.Credentials),
			Config:        parseJSONMap(record.Config),
			UpdatedBy:     record.UpdatedBy,
			UpdatedAt:     &at,
		}
	}
	return out, nil
}

// ServiceIntegration returns one stored integration with decrypted credentials.
func (s *Service) ServiceIntegration(ctx context.Context, provider string) (ServiceIntegration, error) {
	record, err := s.store.IntegrationSetting(ctx, provider)
	if errors.Is(err, pgx.ErrNoRows) {
		return ServiceIntegration{}, ErrUnknownIntegration
	}
	if err != nil {
		return ServiceIntegration{}, err
	}
	at := record.UpdatedAt
	return ServiceIntegration{
		Provider:      record.Provider,
		IsActive:      record.IsActive,
		HealthStatus:  record.HealthStatus,
		AccountName:   record.AccountName,
		LastError:     record.LastError,
		LastCheckedAt: record.LastCheckedAt,
		LastSyncedAt:  record.LastSyncedAt,
		Credentials:   s.decryptCredentials(record.Provider, record.Credentials),
		Config:        parseJSONMap(record.Config),
		UpdatedBy:     record.UpdatedBy,
		UpdatedAt:     &at,
	}, nil
}

// SetIntegration validates, encrypts credentials, and saves an integration.
func (s *Service) SetIntegration(ctx context.Context, providerID string, in SaveIntegrationInput, by string) (ServiceIntegration, error) {
	providerID = strings.TrimSpace(providerID)
	if providerID == "" || len(providerID) > 64 {
		return ServiceIntegration{}, fmt.Errorf("%w: invalid provider id", ErrValidationFailed)
	}

	p, isCatalog := catalog.Integrations.Provider(providerID)
	existing, err := s.store.IntegrationSetting(ctx, providerID)
	exists := err == nil
	currentCreds := map[string]string{}
	if exists {
		currentCreds = s.decryptCredentials(providerID, existing.Credentials)
	}

	nextCreds := make(map[string]string)
	if isCatalog {
		for _, f := range p.Fields {
			incoming := strings.TrimSpace(in.Values[f.Key])
			maxLen := f.MaxLength
			if maxLen <= 0 {
				maxLen = 2000
			}
			if len(incoming) > maxLen {
				return ServiceIntegration{}, fmt.Errorf("%w: %s exceeds maximum length", ErrValidationFailed, f.Key)
			}
			val := incoming
			if f.Secret && incoming == "" {
				val = currentCreds[f.Key]
			}
			if val != "" {
				nextCreds[f.Key] = val
			}
		}
		if envVal, ok := nextCreds["environment"]; ok && envVal != "" {
			envVal = strings.ToLower(envVal)
			nextCreds["environment"] = envVal
			if !slices.Contains(catalog.Integrations.Environments, envVal) {
				return ServiceIntegration{}, fmt.Errorf("%w: invalid environment %q", ErrValidationFailed, envVal)
			}
		}
		if providerID == "paytabs" {
			if reg, ok := nextCreds["region"]; ok && reg != "" {
				reg = strings.ToUpper(reg)
				nextCreds["region"] = reg
				if _, ok := catalog.Integrations.PaytabsRegions[reg]; !ok {
					return ServiceIntegration{}, fmt.Errorf("%w: invalid region %q", ErrValidationFailed, reg)
				}
			}
		}
		if in.IsActive {
			var missing []string
			for _, f := range p.Fields {
				if f.Required && nextCreds[f.Key] == "" {
					missing = append(missing, f.Key)
				}
			}
			if len(missing) > 0 {
				return ServiceIntegration{}, fmt.Errorf("%w: missing required fields: %s", ErrValidationFailed, strings.Join(missing, ", "))
			}
		}
	} else {
		// Non-catalogue provider (e.g. google_calendar)
		for k, v := range in.Values {
			if strings.TrimSpace(v) != "" {
				nextCreds[k] = strings.TrimSpace(v)
			}
		}
	}

	var sealed *string
	if len(nextCreds) > 0 && s.keyring != nil {
		plain, err := json.Marshal(nextCreds)
		if err != nil {
			return ServiceIntegration{}, err
		}
		sealedStr, err := s.keyring.Seal(plain, "integration:"+providerID)
		if err != nil {
			return ServiceIntegration{}, fmt.Errorf("seal credentials: %w", err)
		}
		sealed = &sealedStr
	}

	if in.Config == nil {
		in.Config = map[string]any{}
	}
	configBytes, err := json.Marshal(in.Config)
	if err != nil {
		configBytes = []byte("{}")
	}

	healthStatus := "unknown"
	var lastError *string
	var accountName *string
	if exists {
		healthStatus = existing.HealthStatus
		lastError = existing.LastError
		accountName = existing.AccountName
	}
	// If credentials changed, reset status to unknown
	currPlain, _ := json.Marshal(currentCreds)
	nextPlain, _ := json.Marshal(nextCreds)
	if string(currPlain) != string(nextPlain) {
		healthStatus = "unknown"
		lastError = nil
		accountName = nil
	}

	now := s.now()
	byStr := by
	err = s.store.UpsertIntegration(ctx, sqlcdb.UpsertIntegrationParams{
		Provider:     providerID,
		IsActive:     in.IsActive,
		Credentials:  sealed,
		Config:       configBytes,
		HealthStatus: healthStatus,
		LastError:    lastError,
		AccountName:  accountName,
		UpdatedBy:    &byStr,
		UpdatedAt:    now,
	})
	if err != nil {
		return ServiceIntegration{}, err
	}

	return ServiceIntegration{
		Provider:      providerID,
		IsActive:      in.IsActive,
		HealthStatus:  healthStatus,
		AccountName:   accountName,
		LastError:     lastError,
		Credentials:   nextCreds,
		Config:        in.Config,
		UpdatedBy:     &byStr,
		UpdatedAt:     &now,
		LastCheckedAt: existing.LastCheckedAt,
		LastSyncedAt:  existing.LastSyncedAt,
	}, nil
}

// UnlinkIntegration clears credentials and sets active to false.
func (s *Service) UnlinkIntegration(ctx context.Context, providerID string, by string) error {
	return s.store.UnlinkIntegration(ctx, providerID, by, s.now())
}

// UpdateIntegrationStatus updates status fields and optionally refreshed credentials.
func (s *Service) UpdateIntegrationStatus(ctx context.Context, providerID string, in UpdateIntegrationStatusInput) error {
	existing, err := s.store.IntegrationSetting(ctx, providerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrUnknownIntegration
	}
	if err != nil {
		return err
	}

	healthStatus := existing.HealthStatus
	if in.HealthStatus != nil {
		healthStatus = *in.HealthStatus
	}

	var configBytes []byte
	if in.Config != nil {
		var err error
		configBytes, err = json.Marshal(in.Config)
		if err != nil {
			configBytes = existing.Config
		}
	} else {
		configBytes = existing.Config
	}

	credentials := existing.Credentials
	if len(in.RefreshedCredentials) > 0 && s.keyring != nil {
		current := s.decryptCredentials(providerID, existing.Credentials)
		for k, v := range in.RefreshedCredentials {
			current[k] = v
		}
		plain, err := json.Marshal(current)
		if err == nil {
			sealed, err := s.keyring.Seal(plain, "integration:"+providerID)
			if err == nil {
				credentials = &sealed
			}
		}
	}

	now := s.now()
	return s.store.UpdateIntegrationStatus(ctx, sqlcdb.UpdateIntegrationStatusParams{
		Provider:       providerID,
		HealthStatus:   healthStatus,
		LastError:      in.LastError,
		AccountName:    in.AccountName,
		LastCheckedAt:  in.LastCheckedAt,
		LastSyncedAt:   in.LastSyncedAt,
		Config:         configBytes,
		Credentials:    credentials,
		SyncLeaseToken: in.SyncLeaseToken,
		SyncLeaseUntil: in.SyncLeaseUntil,
		UpdatedAt:      now,
	})
}
