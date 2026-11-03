package app_test

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/migrations"
)

func TestManagedAccounts(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	hasher, err := password.New(password.Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16})
	require.NoError(t, err)
	noLimit := func(context.Context, authn.Realm, string, string, string) error { return nil }
	svc := app.NewManagedAccounts(pool, hasher, 12, 15*time.Minute, 2, noLimit)
	staff := authn.RealmStaff

	session := func(id string) string {
		family := uuid.NewString()
		_, err := pool.Exec(ctx, `INSERT INTO identity.session_family (id,subject_id,realm,expires_at) VALUES ($1,$2,'staff',now()+interval '1 day')`, family, id)
		require.NoError(t, err)
		return family
	}
	revoked := func(family string) bool {
		var at *time.Time
		require.NoError(t, pool.QueryRow(ctx, `SELECT revoked_at FROM identity.session_family WHERE id=$1`, family).Scan(&at))
		return at != nil
	}
	events := func() []string {
		rows, err := pool.Query(ctx, `SELECT subject FROM identity.outbox ORDER BY created_at, id`)
		require.NoError(t, err)
		defer rows.Close()
		var out []string
		for rows.Next() {
			var s string
			require.NoError(t, rows.Scan(&s))
			out = append(out, s)
		}
		return out
	}

	// The app creates and updates its accounts; identity keeps what it is told and records each real change.
	created, err := svc.Sync(ctx, staff, "u1", app.AccountInput{Email: " Sara@Example.com ", Roles: []string{"sales"}, Active: true}, "admin:boss")
	require.NoError(t, err)
	assert.True(t, created)
	created, err = svc.Sync(ctx, staff, "u1", app.AccountInput{Email: "sara@example.com", Roles: []string{"sales"}, Active: true}, "admin:boss")
	require.NoError(t, err)
	assert.False(t, created)
	assert.Equal(t, []string{"identity.user.created"}, events(), "an unchanged sync records nothing")
	_, err = svc.Sync(ctx, staff, "u2", app.AccountInput{Email: "sara@example.com", Active: true}, "admin:boss")
	assert.ErrorIs(t, err, app.ErrEmailTaken)
	for _, bad := range []app.AccountInput{{Email: "not an address", Active: true}, {Email: ""}} {
		_, err = svc.Sync(ctx, staff, "u3", bad, "admin:boss")
		assert.ErrorIs(t, err, app.ErrValidation)
	}
	_, err = svc.Sync(ctx, authn.RealmIT, "u4", app.AccountInput{Email: "it@example.com", Active: true}, "admin:boss")
	assert.ErrorIs(t, err, app.ErrValidation, "IT accounts are managed in the IT dashboard only")

	// A role change signs the account out; a new address alone does not.
	first := session("u1")
	_, err = svc.Sync(ctx, staff, "u1", app.AccountInput{Email: "sara.k@example.com", Roles: []string{"sales"}, Active: true}, "admin:boss")
	require.NoError(t, err)
	assert.False(t, revoked(first))
	_, err = svc.Sync(ctx, staff, "u1", app.AccountInput{Email: "sara.k@example.com", Roles: []string{"manager"}, Active: true}, "admin:boss")
	require.NoError(t, err)
	assert.True(t, revoked(first))

	// Passwords: too short is refused; changing one's own keeps that session and ends the others.
	assert.ErrorIs(t, svc.SetPassword(ctx, staff, "u1", "short", "", "admin:boss"), app.ErrValidation)
	assert.ErrorIs(t, svc.SetPassword(ctx, staff, "nobody", "a-long-enough-password", "", "admin:boss"), app.ErrNotFound)
	mine, other := session("u1"), session("u1")
	require.NoError(t, svc.SetPassword(ctx, staff, "u1", "a-long-enough-password", mine, "admin:u1"))
	assert.False(t, revoked(mine))
	assert.True(t, revoked(other))
	var hash string
	require.NoError(t, pool.QueryRow(ctx, `SELECT password_hash FROM identity.account WHERE realm='staff' AND subject_id='u1'`).Scan(&hash))
	_, err = hasher.Verify("a-long-enough-password", hash) // nil means the password matches
	require.NoError(t, err)

	// A reset link works once, ends every session and replaces an earlier link.
	_, err = svc.RequestReset(ctx, staff, "unknown@example.com", "127.0.0.1")
	assert.ErrorIs(t, err, app.ErrNotFound)
	stale, err := svc.RequestReset(ctx, staff, "SARA.K@example.com", "127.0.0.1")
	require.NoError(t, err)
	assert.Equal(t, "u1", stale.SubjectID)
	link, err := svc.RequestReset(ctx, staff, "sara.k@example.com", "127.0.0.1")
	require.NoError(t, err)
	_, err = svc.ConfirmReset(ctx, staff, stale.Token, "another-long-password")
	assert.ErrorIs(t, err, app.ErrResetInvalid, "a newer link replaces the older one")
	id, err := svc.ConfirmReset(ctx, staff, link.Token, "another-long-password")
	require.NoError(t, err)
	assert.Equal(t, "u1", id)
	assert.True(t, revoked(mine))
	_, err = svc.ConfirmReset(ctx, staff, link.Token, "another-long-password")
	assert.ErrorIs(t, err, app.ErrResetInvalid, "used once")
	expired, err := svc.RequestReset(ctx, staff, "sara.k@example.com", "127.0.0.1")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE identity.password_reset SET expires_at = now() - interval '1 second'`)
	require.NoError(t, err)
	_, err = svc.ConfirmReset(ctx, staff, expired.Token, "another-long-password")
	assert.ErrorIs(t, err, app.ErrResetInvalid)

	// Deactivating signs out; an inactive account cannot ask for a reset.
	last := session("u1")
	_, err = svc.Sync(ctx, staff, "u1", app.AccountInput{Email: "sara.k@example.com", Roles: []string{"manager"}, Active: false}, "admin:boss")
	require.NoError(t, err)
	assert.True(t, revoked(last))
	_, err = svc.RequestReset(ctx, staff, "sara.k@example.com", "127.0.0.1")
	assert.ErrorIs(t, err, app.ErrNotFound)

	// MFA reset turns two-step sign-in off; repeating it records nothing more.
	_, err = pool.Exec(ctx, `UPDATE identity.account SET mfa_enabled=true, mfa_secret_encrypted='sealed' WHERE subject_id='u1'`)
	require.NoError(t, err)
	require.NoError(t, svc.ResetMFA(ctx, staff, "u1", "admin:boss"))
	require.NoError(t, svc.ResetMFA(ctx, staff, "u1", "admin:boss"))
	var mfa bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT mfa_enabled FROM identity.account WHERE subject_id='u1'`).Scan(&mfa))
	assert.False(t, mfa)
	all := events()
	assert.Equal(t, "identity.mfa.changed", all[len(all)-1])
	assert.Len(t, all, 10)
}
