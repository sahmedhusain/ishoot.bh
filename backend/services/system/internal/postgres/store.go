// Package postgres stores the system service's settings in the system schema.
package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

// ModuleSetting is a stored choice for one module.
type ModuleSetting = sqlcdb.SystemModuleSetting

// Store reads and writes the system schema.
type Store struct{ q *sqlcdb.Queries }

// New returns a store on the pool.
func New(pool *pgxpool.Pool) *Store { return &Store{q: sqlcdb.New(pool)} }

// ModuleSettings returns every stored module choice.
func (s *Store) ModuleSettings(ctx context.Context) ([]ModuleSetting, error) {
	return s.q.ListModuleSettings(ctx)
}

// SetModule stores a module choice.
func (s *Store) SetModule(ctx context.Context, key string, enabled bool, by string, now time.Time) error {
	return s.q.SetModule(ctx, sqlcdb.SetModuleParams{ModuleKey: key, Enabled: enabled, UpdatedBy: &by, UpdatedAt: now})
}
