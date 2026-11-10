package sessions_test
import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"sync"
	"testing"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)
func TestSessionLifecycle(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	svc, err := sessions.New(postgres.New(pool), time.Hour)
	require.NoError(t, err)
	now := time.Now().UTC().Truncate(time.Microsecond)
	start := func(realm authn.Realm) sessions.Credential {
		c, err := svc.Start(ctx, realm, "same-subject", now)
		require.NoError(t, err)
		return c
	}
	t.Run("rotation and replay revoke the family", func(t *testing.T) {
		first := start(authn.RealmStaff)
		next, err := svc.Refresh(ctx, authn.RealmStaff, first.Token, now.Add(time.Minute))
		require.NoError(t, err)
		require.NotEqual(t, first.Token, next.Token)
		require.Equal(t, first.Family, next.Family)
		var stored string
		require.NoError(t, pool.QueryRow(ctx, `SELECT token_hash FROM identity.refresh_token WHERE family_id=$1 LIMIT 1`, first.Family.ID).Scan(&stored))
		require.Len(t, stored, 64)
		require.NotEqual(t, first.Token, stored)
		_, err = svc.Refresh(ctx, authn.RealmStaff, first.Token, now.Add(2*time.Minute))
		require.ErrorIs(t, err, sessions.ErrReuse)
		_, err = svc.Active(ctx, authn.RealmStaff, first.Family.ID, now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
		_, err = svc.Refresh(ctx, authn.RealmStaff, next.Token, now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
	})
	t.Run("realm mismatch never consumes or revokes", func(t *testing.T) {
		for _, realm := range []authn.Realm{authn.RealmStaff, authn.RealmCustomer, authn.RealmIT} {
			first := start(realm)
			for _, other := range []authn.Realm{authn.RealmStaff, authn.RealmCustomer, authn.RealmIT} {
				if other == realm {
					continue
				}
				_, err := svc.Refresh(ctx, other, first.Token, now)
				require.ErrorIs(t, err, sessions.ErrInvalid)
				require.NoError(t, svc.Logout(ctx, other, first.Token, now))
				_, err = svc.Active(ctx, other, first.Family.ID, now)
				require.ErrorIs(t, err, sessions.ErrInvalid)
			}
			_, err := svc.Refresh(ctx, realm, first.Token, now)
			require.NoError(t, err)
		}
	})
	t.Run("absolute expiry and logout", func(t *testing.T) {
		first := start(authn.RealmStaff)
		_, err := svc.Refresh(ctx, authn.RealmStaff, first.Token, now.Add(time.Hour))
		require.ErrorIs(t, err, sessions.ErrInvalid)
		first = start(authn.RealmIT)
		next, err := svc.Refresh(ctx, authn.RealmIT, first.Token, now)
		require.NoError(t, err)
		require.NoError(t, svc.Logout(ctx, authn.RealmIT, first.Token, now))
		require.NoError(t, svc.Logout(ctx, authn.RealmIT, first.Token, now))
		_, err = svc.Refresh(ctx, authn.RealmIT, next.Token, now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
	})
	t.Run("concurrent refresh cannot fork a session", func(t *testing.T) {
		first := start(authn.RealmStaff)
		var wg sync.WaitGroup
		results := make(chan error, 2)
		for range 2 {
			wg.Go(func() { _, err := svc.Refresh(ctx, authn.RealmStaff, first.Token, now); results <- err })
		}
		wg.Wait()
		close(results)
		success, reuse := 0, 0
		for err := range results {
			switch {
			case err == nil:
				success++
			case errors.Is(err, sessions.ErrReuse):
				reuse++
			default:
				t.Fatalf("unexpected result: %v", err)
			}
		}
		require.Equal(t, 1, success)
		require.Equal(t, 1, reuse)
		_, err := svc.Active(ctx, authn.RealmStaff, first.Family.ID, now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
	})
	t.Run("failed replacement rolls back token consumption", func(t *testing.T) {
		first := start(authn.RealmStaff)
		sum := sha256.Sum256([]byte(first.Token))
		oldHash := hex.EncodeToString(sum[:])
		repo := postgres.New(pool)
		_, err := repo.Rotate(ctx, authn.RealmStaff, oldHash, oldHash, now)
		require.Error(t, err, "duplicate replacement hash must fail the transaction")
		_, err = svc.Refresh(ctx, authn.RealmStaff, first.Token, now)
		require.NoError(t, err, "failed rotation must leave the original credential usable")
	})
	t.Run("cleanup retains replay evidence until absolute expiry", func(t *testing.T) {
		first := start(authn.RealmStaff)
		_, err := svc.Refresh(ctx, authn.RealmStaff, first.Token, now)
		require.NoError(t, err)
		repo := postgres.New(pool)
		_, err = repo.DeleteExpired(ctx, now.Add(time.Hour-time.Microsecond), 100)
		require.NoError(t, err)
		_, err = svc.Refresh(ctx, authn.RealmStaff, first.Token, now.Add(time.Hour-time.Microsecond))
		require.ErrorIs(t, err, sessions.ErrReuse)
		_, err = repo.DeleteExpired(ctx, now.Add(time.Hour), 100)
		require.NoError(t, err)
		var count int
		require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.refresh_token WHERE family_id=$1`, first.Family.ID).Scan(&count))
		require.Zero(t, count)
	})
	t.Run("invalid caller inputs", func(t *testing.T) {
		_, err := svc.Start(ctx, authn.RealmService, "subject", now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
		_, err = svc.Refresh(ctx, authn.RealmStaff, "bad", now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
		_, err = svc.Active(ctx, authn.RealmStaff, "not-a-uuid", now)
		require.ErrorIs(t, err, sessions.ErrInvalid)
	})
}
