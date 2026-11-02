// Package postgres stores statuses and status windows in the realtime schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/realtime/internal/postgres/sqlcdb"
)

// Schema is the service's database schema (ADR 0002).
const Schema = "realtime"

// Store gives the queries, on the pool or inside one transaction.
type Store struct {
	pool *pgxpool.Pool
	*sqlcdb.Queries
}

// New returns a store on the pool.
func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, Queries: sqlcdb.New(pool)} }

// Tx runs fn in one transaction.
func (s *Store) Tx(ctx context.Context, fn func(*sqlcdb.Queries) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error { return fn(s.WithTx(tx)) })
}
