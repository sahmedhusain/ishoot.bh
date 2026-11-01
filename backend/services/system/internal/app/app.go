// Package app holds the system service's use cases.
package app

import (
	"context"
	"errors"
	"time"

	"platform.local/backend/pkg/catalog"
	"platform.local/backend/services/system/internal/postgres"
)

// ErrUnknownModule means the key is not a module in the catalogue.
var ErrUnknownModule = errors.New("unknown module")

// Module is a catalogue module with its current state.
type Module struct {
	catalog.Module
	Enabled   bool
	UpdatedBy *string
	UpdatedAt *time.Time
}

// Service implements the use cases.
type Service struct {
	store *postgres.Store
	now   func() time.Time
}

// New returns the service.
func New(store *postgres.Store) *Service {
	return &Service{store: store, now: func() time.Time { return time.Now().UTC() }}
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
