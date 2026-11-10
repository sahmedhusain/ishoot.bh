package postgres
import (
	"context"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/notify/internal/postgres/sqlcdb"
)
const Schema = "notify"
type Store struct {
	pool	*pgxpool.Pool
	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Store	{ return &Store{pool: pool, Queries: sqlcdb.New(pool)} }
func (s *Store) Tx(ctx context.Context, fn func(*sqlcdb.Queries, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error { return fn(s.WithTx(tx), tx) })
}
func (s *Store) UpdateStatusByProviderID(ctx context.Context, providerID, status, lastError string) error {
	var errPtr *string
	if lastError != "" {
		errPtr = &lastError
	}
	_, err := s.pool.Exec(ctx, `UPDATE notify.message SET status = $1, last_error = $2, updated_at = now() WHERE provider_id = $3`, status, errPtr, providerID)
	return err
}
func (s *Store) PurgeSentEmailContent(ctx context.Context, before time.Time, batchSize int32) (int64, error) {
	var removed int64
	err := s.Tx(ctx, func(_ *sqlcdb.Queries, tx pgx.Tx) error {
		return tx.QueryRow(ctx, `
WITH stale AS MATERIALIZED (
    SELECT id FROM notify.message
    WHERE channel = 'email' AND status = 'sent' AND sent_at < $1 AND recipient <> ''
    ORDER BY sent_at, id
    LIMIT $2
    FOR UPDATE SKIP LOCKED
),
deleted_attachments AS (
    DELETE FROM notify.attachment WHERE message_id IN (SELECT id FROM stale)
    RETURNING message_id
),
scrubbed AS (
    UPDATE notify.message
    SET recipient = '', actor = NULL, subject = NULL, body_text = NULL, body_html = NULL,
        last_error = NULL
    WHERE id IN (SELECT id FROM stale)
    RETURNING id
)
SELECT count(*) FROM scrubbed`, before, batchSize).Scan(&removed)
	})
	return removed, err
}
