package app
import (
	"context"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/system/internal/postgres"
)
const (
	EventModuleChanged	= "system.module.changed"
	EventIntegrationChanged	= "system.integration.changed"
	EventIntegrationRemoved	= "system.integration.unlinked"
	EventDomainsChanged	= "system.site_domains.changed"
	EventSiteCodeChanged	= "system.site_code.changed"
)
type ModuleChanged struct {
	Key		string	`json:"key"`
	Enabled		bool	`json:"enabled"`
	ChangedBy	string	`json:"changedBy"`
}
type IntegrationChanged struct {
	Provider	string	`json:"provider"`
	IsActive	bool	`json:"isActive"`
	ChangedBy	string	`json:"changedBy"`
}
type IntegrationUnlinked struct {
	Provider	string	`json:"provider"`
	ChangedBy	string	`json:"changedBy"`
}
type DomainsChanged struct {
	WebsiteDomain	string	`json:"websiteDomain"`
	AdminDomain	string	`json:"adminDomain"`
	ChangedBy	string	`json:"changedBy"`
}
type SiteCodeChanged struct {
	ChangedBy string `json:"changedBy"`
}
func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}
