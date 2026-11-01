package jobs_test

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/identity/internal/jobs"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)

func TestRiverCleanupPreservesActiveSessions(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, WithRiver: true, Logger: slog.Default()}))
	repo := postgres.New(pool)
	svc, err := sessions.New(repo, time.Hour)
	require.NoError(t, err)
	for range 2 {
		_, err = svc.Start(ctx, authn.RealmStaff, "expired", time.Now().Add(-2*time.Hour))
		require.NoError(t, err)
	}
	active, err := svc.Start(ctx, authn.RealmStaff, "active", time.Now())
	require.NoError(t, err)
	_, err = svc.Refresh(ctx, authn.RealmStaff, active.Token, time.Now())
	require.NoError(t, err)
	client, err := jobs.NewClient(pool, repo, jobs.Options{Schema: "identity", CleanupInterval: time.Minute, CleanupBatch: 1, Workers: 1, Logger: slog.Default()})
	require.NoError(t, err)
	require.NoError(t, client.Start(ctx))
	defer func() {
		stop, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		require.NoError(t, client.Stop(stop))
	}()
	require.Eventually(t, func() bool {
		var count int
		err := pool.QueryRow(ctx, `SELECT count(*) FROM identity.session_family WHERE subject_id='expired'`).Scan(&count)
		return err == nil && count == 0
	}, 30*time.Second, 200*time.Millisecond)
	var hashes int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.refresh_token WHERE family_id=$1`, active.Family.ID).Scan(&hashes))
	require.Equal(t, 2, hashes, "active token history remains for reuse detection")
}
