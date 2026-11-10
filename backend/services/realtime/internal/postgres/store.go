package postgres
import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/realtime/internal/postgres/sqlcdb"
)
const Schema = "realtime"
type Store struct {
	pool	*pgxpool.Pool
	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Store	{ return &Store{pool: pool, Queries: sqlcdb.New(pool)} }
func (s *Store) Tx(ctx context.Context, fn func(*sqlcdb.Queries) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error { return fn(s.WithTx(tx)) })
}
