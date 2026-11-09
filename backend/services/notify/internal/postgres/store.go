// Package postgres stores messages in the notify schema.
package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/notify/internal/postgres/sqlcdb"
)

// Schema is the service's database schema (ADR 0002); its outbox is notify.outbox.
const Schema = "notify"

// Store gives the queries, on the pool or inside one transaction.
type Store struct {
	pool *pgxpool.Pool
	*sqlcdb.Queries
}

// New returns a store on the pool.
func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, Queries: sqlcdb.New(pool)} }

// Tx runs fn in one transaction; the job and the events of a change are written in the same one.
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

// PurgeSentEmailContent removes personal and message content while preserving delivery status and provider evidence.
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
