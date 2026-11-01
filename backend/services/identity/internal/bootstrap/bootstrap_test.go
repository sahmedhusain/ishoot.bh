package bootstrap_test

import (
	"context"
	"encoding/base32"
	"encoding/base64"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)

type allowGuard struct{}

func (allowGuard) Check(context.Context, authn.Realm, string, string) error { return nil }

func input(email string) bootstrap.Input {
	return bootstrap.Input{Email: email, Password: "a long enough password", Role: "it_admin", MinPasswordLength: 14,
		RecoveryCount: 3, Issuer: "Platform IT", Digits: 6, Period: 30 * time.Second}
}

func TestValidate(t *testing.T) {
	for name, in := range map[string]bootstrap.Input{
		"bad email":      func() bootstrap.Input { i := input("not-an-email"); return i }(),
		"short password": func() bootstrap.Input { i := input("it@example.test"); i.Password = "short"; return i }(),
		"unknown role":   func() bootstrap.Input { i := input("it@example.test"); i.Role = "admin"; return i }(),
	} {
		assert.Error(t, in.Validate(), name)
	}
	assert.NoError(t, input("it@example.test").Validate())
}

func TestCreateITAdminSignsInWithTheEnrolledFactor(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	hasher, err := password.New(password.Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16})
	require.NoError(t, err)
	key := base64.StdEncoding.EncodeToString([]byte(strings.Repeat("a", 32)))
	ring, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + key}, PrimaryKeyID: "primary"})
	require.NoError(t, err)
	now := time.Now().UTC().Truncate(time.Second)

	// Two operators racing: exactly one account is created.
	var wg sync.WaitGroup
	results := make(chan error, 2)
	created := make(chan bootstrap.Result, 2)
	for _, email := range []string{"It@Example.Test ", "other@example.test"} {
		wg.Go(func() {
			r, err := bootstrap.CreateITAdmin(ctx, pool, hasher, ring, input(email), now)
			results <- err
			if err == nil {
				created <- r
			}
		})
	}
	wg.Wait()
	close(results)
	close(created)
	var failures int
	for err := range results {
		if err != nil {
			require.ErrorIs(t, err, bootstrap.ErrExists)
			failures++
		}
	}
	require.Equal(t, 1, failures)
	result := <-created
	assert.Len(t, result.RecoveryCodes, 3)
	assert.Contains(t, result.OTPAuthURL, "otpauth://totp/Platform%20IT:")
	assert.Contains(t, result.OTPAuthURL, "secret="+result.Secret)

	var email string
	require.NoError(t, pool.QueryRow(ctx, `SELECT email FROM identity.account WHERE realm='it' AND subject_id=$1`, result.SubjectID).Scan(&email))

	// The account signs in with the password and a code from the printed secret.
	repo := postgres.New(pool)
	sessionService, err := sessions.New(repo, time.Hour)
	require.NoError(t, err)
	otp, err := totp.New(totp.Config{Period: 30 * time.Second, Digits: 6, Window: 1})
	require.NoError(t, err)
	svc, err := accounts.New(repo, hasher, ring, otp, sessionService, 2, allowGuard{}, accounts.MFAConfig{EnrollmentTTL: time.Minute, RecoveryCount: 3, Digits: 6, Period: 30 * time.Second})
	require.NoError(t, err)
	login := accounts.Input{Realm: authn.RealmIT, Email: email, Password: "a long enough password"}
	_, err = svc.Login(ctx, login, now)
	require.ErrorIs(t, err, accounts.ErrMFARequired)
	secret, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(result.Secret)
	require.NoError(t, err)
	login.OTP, err = otp.Code(secret, now.Unix()/30)
	require.NoError(t, err)
	signedIn, err := svc.Login(ctx, login, now)
	require.NoError(t, err)
	assert.Equal(t, []string{"it_admin"}, signedIn.Account.Roles)
}
