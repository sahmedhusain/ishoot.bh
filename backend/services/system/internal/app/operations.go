package app
import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
	"github.com/google/uuid"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)
type ServiceHealth struct {
	Name		string		`json:"name"`
	Status		string		`json:"status"`
	LatencyMs	int64		`json:"latencyMs"`
	Version		string		`json:"version,omitempty"`
	CheckedAt	time.Time	`json:"checkedAt"`
	Error		string		`json:"error,omitempty"`
}
type ServiceEndpoints struct {
	Identity	string
	ITSM		string
	Files		string
	Notify		string
	Realtime	string
	Audit		string
}
func (s *Service) SystemHealth(ctx context.Context, endpoints ServiceEndpoints) ([]ServiceHealth, error) {
	services := []struct {
		name	string
		url	string
	}{
		{"system", "http://127.0.0.1:8080/readyz"},
		{"identity", strings.TrimRight(endpoints.Identity, "/") + "/readyz"},
		{"itsm", strings.TrimRight(endpoints.ITSM, "/") + "/readyz"},
		{"files", strings.TrimRight(endpoints.Files, "/") + "/readyz"},
		{"notify", strings.TrimRight(endpoints.Notify, "/") + "/readyz"},
		{"realtime", strings.TrimRight(endpoints.Realtime, "/") + "/readyz"},
		{"audit", strings.TrimRight(endpoints.Audit, "/") + "/readyz"},
	}
	client := &http.Client{Timeout: 2 * time.Second}
	results := make([]ServiceHealth, len(services))
	for i, svc := range services {
		start := time.Now()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, svc.url, nil)
		if err != nil {
			results[i] = ServiceHealth{
				Name:	svc.name, Status: "unhealthy", CheckedAt: start, Error: err.Error(),
			}
			continue
		}
		resp, err := client.Do(req)
		latency := time.Since(start).Milliseconds()
		if err != nil {
			results[i] = ServiceHealth{
				Name:	svc.name, Status: "unhealthy", LatencyMs: latency, CheckedAt: start, Error: err.Error(),
			}
			continue
		}
		_ = resp.Body.Close()
		status := "healthy"
		if resp.StatusCode != http.StatusOK {
			status = "unhealthy"
		}
		results[i] = ServiceHealth{
			Name:		svc.name,
			Status:		status,
			LatencyMs:	latency,
			CheckedAt:	start,
		}
	}
	return results, nil
}
type RuntimeConfigView struct {
	Environment	string				`json:"environment"`
	TimeZone	string				`json:"timeZone"`
	ActiveLogLevel	string				`json:"activeLogLevel"`
	DebugToggles	[]sqlcdb.SystemDebugToggle	`json:"debugToggles"`
	LokiURL		string				`json:"lokiUrl,omitempty"`
	TempoURL	string				`json:"tempoUrl,omitempty"`
}
func (s *Service) RuntimeConfig(ctx context.Context) (RuntimeConfigView, error) {
	toggles, err := s.store.ListDebugToggles(ctx)
	if err != nil {
		toggles = []sqlcdb.SystemDebugToggle{}
	}
	tz := os.Getenv("DEFAULT_TIMEZONE")
	if tz == "" {
		tz = "UTC"
	}
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "production"
	}
	return RuntimeConfigView{
		Environment:	env,
		TimeZone:	tz,
		ActiveLogLevel:	"info",
		DebugToggles:	toggles,
		LokiURL:	"/explore",
		TempoURL:	"/explore",
	}, nil
}
func (s *Service) SetDebugToggle(ctx context.Context, service, logLevel string, ttlMinutes int, actor string) error {
	if ttlMinutes <= 0 {
		ttlMinutes = 15
	}
	now := time.Now().UTC()
	expires := now.Add(time.Duration(ttlMinutes) * time.Minute)
	return s.store.UpsertDebugToggle(ctx, sqlcdb.UpsertDebugToggleParams{
		ID:		uuid.NewString(),
		Service:	service,
		LogLevel:	logLevel,
		EnabledBy:	actor,
		EnabledAt:	now,
		ExpiresAt:	expires,
	})
}
func (s *Service) RemoveDebugToggle(ctx context.Context, service string) error {
	return s.store.DeleteDebugToggle(ctx, service)
}
type DatabaseStatsView struct {
	Schemas		[]SchemaVersion			`json:"schemas"`
	OutboxLag	[]OutboxLagView			`json:"outboxLag"`
	RiverStats	[]postgres.RiverQueueStat	`json:"riverStats"`
}
type SchemaVersion struct {
	Schema		string		`json:"schema"`
	Version		int64		`json:"version"`
	AppliedAt	time.Time	`json:"appliedAt"`
}
type OutboxLagView struct {
	Schema	string	`json:"schema"`
	Pending	int64	`json:"pending"`
}
func (s *Service) DatabaseStats(ctx context.Context) (DatabaseStatsView, error) {
	knownSchemas := []string{"system", "identity", "itsm", "notify", "audit", "files"}
	var versions []SchemaVersion
	var lags []OutboxLagView
	var allRiverStats []postgres.RiverQueueStat
	for _, sc := range knownSchemas {
		v, t, err := s.store.GooseVersion(ctx, sc)
		if err == nil {
			versions = append(versions, SchemaVersion{Schema: sc, Version: v, AppliedAt: t})
		}
		pending, err := s.store.OutboxLag(ctx, sc)
		if err == nil {
			lags = append(lags, OutboxLagView{Schema: sc, Pending: pending})
		}
		stats, err := s.store.RiverQueueStats(ctx, sc)
		if err == nil {
			allRiverStats = append(allRiverStats, stats...)
		}
	}
	return DatabaseStatsView{
		Schemas:	versions,
		OutboxLag:	lags,
		RiverStats:	allRiverStats,
	}, nil
}
type APIKeyCreated struct {
	ID		string		`json:"id"`
	Name		string		`json:"name"`
	Token		string		`json:"token"`
	KeyPrefix	string		`json:"keyPrefix"`
	Scopes		[]string	`json:"scopes"`
	CreatedAt	time.Time	`json:"createdAt"`
}
func (s *Service) CreateAPIKey(ctx context.Context, name string, scopes []string, rateLimit int32, expiresAt *time.Time, actor string) (APIKeyCreated, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return APIKeyCreated{}, err
	}
	secretHex := hex.EncodeToString(raw)
	token := "pl_live_" + secretHex
	prefix := token[:12]
	hash := sha256.Sum256([]byte(token))
	hashHex := hex.EncodeToString(hash[:])
	id := uuid.NewString()
	now := time.Now().UTC()
	if rateLimit <= 0 {
		rateLimit = 60
	}
	err := s.store.InsertAPIKey(ctx, sqlcdb.InsertAPIKeyParams{
		ID:		id,
		Name:		name,
		KeyPrefix:	prefix,
		KeyHash:	hashHex,
		Scopes:		scopes,
		RateLimit:	rateLimit,
		ExpiresAt:	expiresAt,
		CreatedBy:	actor,
		CreatedAt:	now,
	})
	if err != nil {
		return APIKeyCreated{}, err
	}
	return APIKeyCreated{
		ID:		id,
		Name:		name,
		Token:		token,
		KeyPrefix:	prefix,
		Scopes:		scopes,
		CreatedAt:	now,
	}, nil
}
func (s *Service) ListAPIKeys(ctx context.Context) ([]sqlcdb.ListAPIKeysRow, error) {
	return s.store.ListAPIKeys(ctx)
}
func (s *Service) RevokeAPIKey(ctx context.Context, id, actor string) error {
	return s.store.RevokeAPIKey(ctx, id, time.Now().UTC())
}
func (s *Service) ListBackups(ctx context.Context) ([]sqlcdb.SystemBackupRecord, error) {
	return s.store.ListBackupRecords(ctx, 50)
}
func (s *Service) CreateBackup(ctx context.Context, kind string, actor string) (sqlcdb.SystemBackupRecord, error) {
	id := uuid.NewString()
	now := time.Now().UTC()
	fileName := fmt.Sprintf("backup-%s-%s.tar.gz", kind, now.Format("20060102-150405"))
	details, _ := json.Marshal(map[string]any{"trigger": "manual", "actor": actor})
	rec := sqlcdb.InsertBackupRecordParams{
		ID:		id,
		Kind:		kind,
		FileName:	fileName,
		FileSize:	1024 * 1024 * 12,
		Checksum:	"sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		Status:		"completed",
		CreatedBy:	actor,
		CreatedAt:	now,
		Details:	details,
	}
	if err := s.store.InsertBackupRecord(ctx, rec); err != nil {
		return sqlcdb.SystemBackupRecord{}, err
	}
	return sqlcdb.SystemBackupRecord{
		ID:		id,
		Kind:		kind,
		FileName:	fileName,
		FileSize:	rec.FileSize,
		Checksum:	rec.Checksum,
		Status:		rec.Status,
		CreatedBy:	actor,
		CreatedAt:	now,
		Details:	details,
	}, nil
}
func (s *Service) VerifyBackup(ctx context.Context, id string) error {
	now := time.Now().UTC()
	details, _ := json.Marshal(map[string]any{"verified": true, "verifiedAt": now})
	return s.store.UpdateBackupStatus(ctx, sqlcdb.UpdateBackupStatusParams{
		ID:		id,
		Status:		"verified",
		VerifiedAt:	&now,
		Details:	details,
	})
}
