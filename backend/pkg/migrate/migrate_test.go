package migrate_test
import (
	"context"
	"io"
	"log/slog"
	"os"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
)
func TestRunIsIdempotentAndStaysInTheSchema(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	pool, err := db.Open(ctx, db.Config{
		URL:	testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute, MaxConnIdleTime: time.Minute,
		HealthCheckPeriod:	time.Minute, StatementTimeout: time.Minute,
	}, logger)
	require.NoError(t, err)
	defer pool.Close()
	opts := migrate.Options{Schema: "sample", Migrations: os.DirFS("testdata"), WithRiver: true, Logger: logger}
	require.NoError(t, migrate.Run(ctx, pool, opts))
	require.NoError(t, migrate.Run(ctx, pool, opts), "a second run does nothing")
	var tables []string
	rows, err := pool.Query(ctx, `SELECT table_schema || '.' || table_name FROM information_schema.tables
		WHERE table_name IN ('thing', 'goose_db_version', 'river_job') ORDER BY 1`)
	require.NoError(t, err)
	for rows.Next() {
		var name string
		require.NoError(t, rows.Scan(&name))
		tables = append(tables, name)
	}
	assert.Equal(t, []string{"sample.goose_db_version", "sample.river_job", "sample.thing"}, tables)
	assert.Error(t, migrate.Run(ctx, pool, migrate.Options{Schema: "Bad-Name", Migrations: os.DirFS("testdata"), Logger: logger}))
}
