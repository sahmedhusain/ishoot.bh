package db_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/testkit"
)

func TestOpenTransactionsAndTimeout(t *testing.T) {
	ctx := context.Background()
	cfg := db.Config{
		URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute, MaxConnIdleTime: time.Minute,
		HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second, LogQueries: true,
	}
	pool, err := db.Open(ctx, cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, db.Check(pool)(ctx))

	_, err = pool.Exec(ctx, `CREATE TABLE item (name text PRIMARY KEY)`)
	require.NoError(t, err)

	t.Run("commit", func(t *testing.T) {
		err := db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, `INSERT INTO item VALUES ('kept')`)
			return err
		})
		require.NoError(t, err)
	})

	t.Run("rollback on error", func(t *testing.T) {
		failure := errors.New("rule broken")
		err := db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
			_, _ = tx.Exec(ctx, `INSERT INTO item VALUES ('dropped')`)
			return failure
		})
		assert.ErrorIs(t, err, failure)
	})

	t.Run("rollback on panic", func(t *testing.T) {
		assert.Panics(t, func() {
			_ = db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
				_, _ = tx.Exec(ctx, `INSERT INTO item VALUES ('panicked')`)
				panic("boom")
			})
		})
	})

	var names []string
	rows, err := pool.Query(ctx, `SELECT name FROM item ORDER BY name`)
	require.NoError(t, err)
	names, err = pgx.CollectRows(rows, pgx.RowTo[string])
	require.NoError(t, err)
	assert.Equal(t, []string{"kept"}, names)

	// The statement timeout reaches the server. A pool of its own, so a slow machine cannot trip the setup above.
	cfg.StatementTimeout = 200 * time.Millisecond
	short, err := db.Open(ctx, cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
	defer short.Close()
	_, err = short.Exec(ctx, `SELECT pg_sleep(1)`)
	assert.ErrorContains(t, err, "statement timeout")
}

func TestSession(t *testing.T) {
	cfg := db.Config{URL: "postgres://pooler/db"}
	require.Equal(t, "postgres://pooler/db", cfg.Session().URL, "without a direct URL the one URL is direct")
	cfg.DirectURL = "postgres://postgres/db"
	require.Equal(t, "postgres://postgres/db", cfg.Session().URL)
	require.Equal(t, "postgres://pooler/db", cfg.URL)
}
