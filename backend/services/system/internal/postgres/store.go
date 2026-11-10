package postgres
import (
	"context"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)
const Schema = "system"
type ModuleSetting = sqlcdb.SystemModuleSetting
type IntegrationSetting = sqlcdb.SystemIntegrationSetting
type SiteSetting = sqlcdb.SystemSiteSetting
type Store struct {
	pool	*pgxpool.Pool
	q	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Store	{ return &Store{pool: pool, q: sqlcdb.New(pool)} }
func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}
func (s *Store) ModuleSettings(ctx context.Context) ([]ModuleSetting, error) {
	return s.q.ListModuleSettings(ctx)
}
func (s *Store) SetModule(ctx context.Context, key string, enabled bool, by string, now time.Time) error {
	return s.q.SetModule(ctx, sqlcdb.SetModuleParams{ModuleKey: key, Enabled: enabled, UpdatedBy: &by, UpdatedAt: now})
}
func (s *Store) IntegrationSettings(ctx context.Context) ([]IntegrationSetting, error) {
	return s.q.ListIntegrations(ctx)
}
func (s *Store) IntegrationSetting(ctx context.Context, provider string) (IntegrationSetting, error) {
	return s.q.GetIntegration(ctx, provider)
}
func (s *Store) UpsertIntegration(ctx context.Context, p sqlcdb.UpsertIntegrationParams) error {
	return s.q.UpsertIntegration(ctx, p)
}
func (s *Store) UnlinkIntegration(ctx context.Context, provider string, by string, now time.Time) error {
	return s.q.UnlinkIntegration(ctx, sqlcdb.UnlinkIntegrationParams{
		Provider:	provider,
		UpdatedBy:	&by,
		UpdatedAt:	now,
	})
}
func (s *Store) UpdateIntegrationStatus(ctx context.Context, p sqlcdb.UpdateIntegrationStatusParams) error {
	return s.q.UpdateIntegrationStatus(ctx, p)
}
func (s *Store) ClaimSyncLease(ctx context.Context, provider, token string, leaseUntil, now time.Time) (bool, error) {
	rows, err := s.q.ClaimSyncLease(ctx, sqlcdb.ClaimSyncLeaseParams{
		Provider:	provider,
		SyncLeaseToken:	&token,
		SyncLeaseUntil:	&leaseUntil,
		Now:		&now,
	})
	return rows > 0, err
}
func (s *Store) Site(ctx context.Context) (SiteSetting, error) {
	return s.q.GetSite(ctx)
}
func (s *Store) SetSiteDomains(ctx context.Context, website, admin *string, by string, now time.Time) error {
	return s.q.SetSiteDomains(ctx, sqlcdb.SetSiteDomainsParams{WebsiteDomain: website, AdminDomain: admin, UpdatedBy: &by, UpdatedAt: now})
}
func (s *Store) SetSiteCode(ctx context.Context, code []byte, by string, now time.Time) error {
	return s.q.SetSiteCode(ctx, sqlcdb.SetSiteCodeParams{Code: code, UpdatedBy: &by, UpdatedAt: now})
}
