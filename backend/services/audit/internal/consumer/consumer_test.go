package consumer_test
import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"
	tcnats "github.com/testcontainers/testcontainers-go/modules/nats"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/audit/internal/app"
	"platform.local/backend/services/audit/internal/consumer"
	"platform.local/backend/services/audit/internal/postgres"
	"platform.local/backend/services/audit/migrations"
)
func TestConsumer(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test: needs Docker")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: logger}))
	container, err := tcnats.Run(ctx, "nats:2.12-alpine")
	require.NoError(t, err)
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })
	natsURL, err := container.ConnectionString(ctx)
	require.NoError(t, err)
	client, err := natsx.Connect(ctx, natsx.Config{URL: natsURL, Stream: "EVENTS", Subjects: []string{"system.>"}, Replicas: 1,
		MaxAge:	time.Hour, DuplicateWindow: time.Minute, PublishTimeout: 5 * time.Second}, "test", logger)
	require.NoError(t, err)
	defer client.Close()
	msg := outbox.Message{ID: "7d3f1c2e-5b6a-4c8d-9e0f-1a2b3c4d5e6f", Subject: "system.site_code.changed",
		Data:	[]byte(`{"changedBy":"it:alice"}`)}
	require.NoError(t, client.Publish(ctx, msg))
	require.NoError(t, client.Publish(ctx, msg))
	c, err := consumer.New(app.New(postgres.New(pool)), logger, prometheus.NewRegistry())
	require.NoError(t, err)
	go func() { _ = c.Run(ctx, client) }()
	require.Eventually(t, func() bool {
		var n int
		return pool.QueryRow(ctx, `SELECT count(*) FROM audit.event WHERE id = $1 AND actor = 'it:alice'`, msg.ID).Scan(&n) == nil && n == 1
	}, 15*time.Second, 200*time.Millisecond)
}
