package app

import (
	"context"

	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/system/internal/postgres"
)

// Events the service announces (ADR 0003). Each has a schema in contracts/events/<subject>.v1.json. They name who
// made the change and never carry credentials or code.
const (
	EventModuleChanged      = "system.module.changed"
	EventIntegrationChanged = "system.integration.changed"
	EventIntegrationRemoved = "system.integration.unlinked"
	EventDomainsChanged     = "system.site_domains.changed"
	EventSiteCodeChanged    = "system.site_code.changed"
)

// ModuleChanged is the payload of system.module.changed.
type ModuleChanged struct {
	Key       string `json:"key"`
	Enabled   bool   `json:"enabled"`
	ChangedBy string `json:"changedBy"`
}

// IntegrationChanged is the payload of system.integration.changed.
type IntegrationChanged struct {
	Provider  string `json:"provider"`
	IsActive  bool   `json:"isActive"`
	ChangedBy string `json:"changedBy"`
}

// IntegrationUnlinked is the payload of system.integration.unlinked.
type IntegrationUnlinked struct {
	Provider  string `json:"provider"`
	ChangedBy string `json:"changedBy"`
}

// DomainsChanged is the payload of system.site_domains.changed.
type DomainsChanged struct {
	WebsiteDomain string `json:"websiteDomain"`
	AdminDomain   string `json:"adminDomain"`
	ChangedBy     string `json:"changedBy"`
}

// SiteCodeChanged is the payload of system.site_code.changed.
type SiteCodeChanged struct {
	ChangedBy string `json:"changedBy"`
}

// change runs write and records the event in one transaction: both happen, or neither.
func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}
