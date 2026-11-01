// Package postgres stores the system service's settings in the system schema.
package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

// Schema is the service's database schema (ADR 0002); its outbox is system.outbox.
const Schema = "system"

// ModuleSetting is a stored choice for one module.
type ModuleSetting = sqlcdb.SystemModuleSetting

// IntegrationSetting is a stored setting for one provider.
type IntegrationSetting = sqlcdb.SystemIntegrationSetting

// SiteSetting is the website's stored technical settings.
type SiteSetting = sqlcdb.SystemSiteSetting

// Store reads and writes the system schema.
type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

// New returns a store on the pool.
func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

// Tx runs fn with a store bound to one transaction; the events of the change are written in the same transaction.
func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}

// ModuleSettings returns every stored module choice.
func (s *Store) ModuleSettings(ctx context.Context) ([]ModuleSetting, error) {
	return s.q.ListModuleSettings(ctx)
}

// SetModule stores a module choice.
func (s *Store) SetModule(ctx context.Context, key string, enabled bool, by string, now time.Time) error {
	return s.q.SetModule(ctx, sqlcdb.SetModuleParams{ModuleKey: key, Enabled: enabled, UpdatedBy: &by, UpdatedAt: now})
}

// IntegrationSettings returns every stored integration.
func (s *Store) IntegrationSettings(ctx context.Context) ([]IntegrationSetting, error) {
	return s.q.ListIntegrations(ctx)
}

// IntegrationSetting returns one stored integration by provider ID.
func (s *Store) IntegrationSetting(ctx context.Context, provider string) (IntegrationSetting, error) {
	return s.q.GetIntegration(ctx, provider)
}

// UpsertIntegration updates or inserts an integration.
func (s *Store) UpsertIntegration(ctx context.Context, p sqlcdb.UpsertIntegrationParams) error {
	return s.q.UpsertIntegration(ctx, p)
}

// UnlinkIntegration unlinks an integration.
func (s *Store) UnlinkIntegration(ctx context.Context, provider string, by string, now time.Time) error {
	return s.q.UnlinkIntegration(ctx, sqlcdb.UnlinkIntegrationParams{
		Provider:  provider,
		UpdatedBy: &by,
		UpdatedAt: now,
	})
}

// UpdateIntegrationStatus updates status and related sync fields.
func (s *Store) UpdateIntegrationStatus(ctx context.Context, p sqlcdb.UpdateIntegrationStatusParams) error {
	return s.q.UpdateIntegrationStatus(ctx, p)
}

// ClaimSyncLease claims a sync lease for a social provider.
func (s *Store) ClaimSyncLease(ctx context.Context, provider, token string, leaseUntil, now time.Time) (bool, error) {
	rows, err := s.q.ClaimSyncLease(ctx, sqlcdb.ClaimSyncLeaseParams{
		Provider:       provider,
		SyncLeaseToken: &token,
		SyncLeaseUntil: &leaseUntil,
		Now:            &now,
	})
	return rows > 0, err
}

// Site returns the website's technical settings; pgx.ErrNoRows when none were saved yet.
func (s *Store) Site(ctx context.Context) (SiteSetting, error) {
	return s.q.GetSite(ctx)
}

// SetSiteDomains stores the website and admin domains (nil clears one).
func (s *Store) SetSiteDomains(ctx context.Context, website, admin *string, by string, now time.Time) error {
	return s.q.SetSiteDomains(ctx, sqlcdb.SetSiteDomainsParams{WebsiteDomain: website, AdminDomain: admin, UpdatedBy: &by, UpdatedAt: now})
}

// SetSiteCode stores the site-wide analytics ids and custom code.
func (s *Store) SetSiteCode(ctx context.Context, code []byte, by string, now time.Time) error {
	return s.q.SetSiteCode(ctx, sqlcdb.SetSiteCodeParams{Code: code, UpdatedBy: &by, UpdatedAt: now})
}
