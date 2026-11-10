package app_test
import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/audit/internal/app"
	"platform.local/backend/services/audit/internal/postgres"
	"platform.local/backend/services/audit/migrations"
)
func setup(t *testing.T) (*app.Service, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS,
		Logger:	slog.New(slog.NewTextHandler(io.Discard, nil))}))
	return app.New(postgres.New(pool)), pool
}
func TestRecord(t *testing.T) {
	ctx := context.Background()
	svc, pool := setup(t)
	at := time.Date(2026, 11, 2, 9, 0, 0, 0, time.UTC)
	in := app.Incoming{ID: "0b6c1f0e-1d0f-4e57-9e7e-8a0f3c1b2a11", Subject: "system.module.changed",
		Data:	[]byte(`{"key":"cms","enabled":false,"changedBy":"it:alice"}`), OccurredAt: at,
		Traceparent:	"00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01", Stream: "EVENTS", Sequence: 1}
	isNew, err := svc.Record(ctx, in)
	require.NoError(t, err)
	assert.True(t, isNew)
	isNew, err = svc.Record(ctx, in)
	require.NoError(t, err)
	assert.False(t, isNew, "a redelivery is recorded once")
	ev, err := svc.Get(ctx, in.ID)
	require.NoError(t, err)
	assert.Equal(t, "system", ev.Service)
	assert.Equal(t, "module", ev.Entity)
	assert.Equal(t, "changed", ev.Verb)
	assert.Equal(t, "it:alice", *ev.Actor)
	assert.Equal(t, "0af7651916cd43dd8448eb211c80319c", *ev.TraceID)
	assert.True(t, at.Equal(ev.OccurredAt))
	odd := app.Incoming{Subject: "legacy.ping", Data: []byte("not json"), OccurredAt: at, Stream: "EVENTS", Sequence: 7}
	isNew, err = svc.Record(ctx, odd)
	require.NoError(t, err)
	assert.True(t, isNew)
	isNew, err = svc.Record(ctx, odd)
	require.NoError(t, err)
	assert.False(t, isNew, "the ID derived from the stream position is stable")
	page, err := svc.List(ctx, app.Query{Service: "legacy", Limit: 10})
	require.NoError(t, err)
	require.Len(t, page, 1)
	assert.JSONEq(t, `{"raw":"not json"}`, string(page[0].Payload))
	assert.Equal(t, "ping", page[0].Verb)
	assert.Nil(t, page[0].Actor)
	for _, sql := range []string{`UPDATE audit.event SET actor = 'mallory'`, `DELETE FROM audit.event`, `TRUNCATE audit.event`} {
		_, err := pool.Exec(ctx, sql)
		assert.ErrorContains(t, err, "append-only", sql)
	}
	_, err = svc.Get(ctx, "not-a-uuid")
	assert.ErrorIs(t, err, app.ErrNotFound)
}
