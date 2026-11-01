package accounts_test

import (
	"context"
	"encoding/base64"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)

type allowGuard struct{}

func (allowGuard) Check(context.Context, authn.Realm, string, string) error { return nil }

func TestLoginAtomicityAndMFA(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	repo := postgres.New(pool)
	sessionService, err := sessions.New(repo, time.Hour)
	require.NoError(t, err)
	hasher, err := password.New(password.Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16})
	require.NoError(t, err)
	legacyKey := base64.StdEncoding.EncodeToString([]byte(strings.Repeat("b", 32)))
	primaryKey := base64.StdEncoding.EncodeToString([]byte(strings.Repeat("a", 32)))
	ring, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + primaryKey}, PrimaryKeyID: "primary", LegacyMFAKey: legacyKey})
	require.NoError(t, err)
	otp, err := totp.New(totp.Config{Period: 30 * time.Second, Digits: 6, Window: 1})
	require.NoError(t, err)
	svc, err := accounts.New(repo, hasher, ring, otp, sessionService, 2, allowGuard{}, accounts.MFAConfig{EnrollmentTTL: 10 * time.Minute, RecoveryCount: 10, Digits: 6, Period: 30 * time.Second})
	require.NoError(t, err)
	now := time.Now().UTC().Truncate(time.Second)
	legacy, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	require.NoError(t, err)
	// Fixed fixture written by the existing Node MFA encryptor with user ID user-123 as AAD.
	const legacyMFA = "MTIzNDU2Nzg5MDEy.WAqUAxCQ3k3ssm1UH8s12w==.KMdZE+lMPbU7vI5DnqCbdg=="
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,password_hash,roles,mfa_enabled,mfa_secret_encrypted) VALUES ('staff','user-123','alice@example.test',$1,ARRAY['admin'],true,$2),('customer','customer-1','alice@example.test',NULL,ARRAY[]::text[],false,NULL)`, string(legacy), legacyMFA)
	require.NoError(t, err)
	input := accounts.Input{Realm: authn.RealmStaff, Email: "  Alice@Example.Test  ", Password: "correct-password"}
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmStaff, Email: "missing@example.test", Password: "anything"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid)
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmCustomer, Email: "alice@example.test", Password: "correct-password"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid)
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmStaff, Email: input.Email, Password: "wrong"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid)
	_, err = svc.Login(ctx, input, now)
	require.ErrorIs(t, err, accounts.ErrMFARequired)
	var stored string
	require.NoError(t, pool.QueryRow(ctx, `SELECT password_hash FROM identity.account WHERE realm='staff' AND subject_id='user-123'`).Scan(&stored))
	require.Equal(t, string(legacy), stored, "an incomplete MFA login must not rehash the password")
	code, err := otp.Code([]byte("JBSWY3DPEHPK3PXP"), now.Unix()/30)
	require.NoError(t, err)
	input.OTP = code
	result, err := svc.Login(ctx, input, now)
	require.NoError(t, err)
	require.Equal(t, "user-123", result.Account.SubjectID)
	require.Equal(t, []string{"admin"}, result.Account.Roles)
	_, err = sessionService.Active(ctx, authn.RealmStaff, result.Credential.Family.ID, now)
	require.NoError(t, err)
	require.NoError(t, pool.QueryRow(ctx, `SELECT password_hash FROM identity.account WHERE realm='staff' AND subject_id='user-123'`).Scan(&stored))
	require.True(t, strings.HasPrefix(stored, "$argon2id$"))
	_, err = svc.Login(ctx, input, now)
	require.ErrorIs(t, err, accounts.ErrInvalid, "a TOTP step cannot be replayed")

	_, err = svc.Refresh(ctx, authn.RealmCustomer, result.Credential.Token, now)
	require.ErrorIs(t, err, sessions.ErrInvalid)
	refreshed, err := svc.Refresh(ctx, authn.RealmStaff, result.Credential.Token, now)
	require.NoError(t, err)
	require.Equal(t, []string{"admin"}, refreshed.Account.Roles)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET active=false WHERE realm='staff' AND subject_id='user-123'`)
	require.NoError(t, err)
	_, err = svc.Refresh(ctx, authn.RealmStaff, refreshed.Credential.Token, now)
	require.ErrorIs(t, err, sessions.ErrInvalid)
	_, err = sessionService.Active(ctx, authn.RealmStaff, result.Credential.Family.ID, now)
	require.ErrorIs(t, err, sessions.ErrInvalid, "disabled accounts revoke the session family on refresh")

	// IT accounts cannot log in without MFA enrollment, and one recovery code cannot create two sessions.
	stronger, err := hasher.Hash("it-password")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,password_hash) VALUES ('it','it-1','it@example.test',$1)`, stronger)
	require.NoError(t, err)
	it := accounts.Input{Realm: authn.RealmIT, Email: "it@example.test", Password: "it-password"}
	_, err = svc.Login(ctx, it, now)
	require.ErrorIs(t, err, accounts.ErrInvalid)
	secret, err := ring.Seal([]byte("12345678901234567890"), "it-1")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET mfa_enabled=true,mfa_secret_encrypted=$1 WHERE realm='it' AND subject_id='it-1'`, secret)
	require.NoError(t, err)
	_, err = svc.Login(ctx, it, now)
	require.ErrorIs(t, err, accounts.ErrMFARequired)
	codes, hashes, err := totp.NewRecoveryCodes(1)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.mfa_recovery_code (realm,subject_id,code_hash) VALUES ('it','it-1',$1)`, hashes[0])
	require.NoError(t, err)
	it.OTP = codes[0]
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for range 2 {
		wg.Go(func() { _, err := svc.Login(ctx, it, now); results <- err })
	}
	wg.Wait()
	close(results)
	successes, rejections := 0, 0
	for err := range results {
		switch {
		case err == nil:
			successes++
		case errors.Is(err, accounts.ErrInvalid):
			rejections++
		default:
			t.Fatalf("unexpected login error: %v", err)
		}
	}
	require.Equal(t, 1, successes)
	require.Equal(t, 1, rejections)
	var count int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.session_family WHERE realm='it' AND subject_id='it-1'`).Scan(&count))
	require.Equal(t, 1, count)

	// A password reset or deactivation between the slow password check and the commit invalidates the snapshot.
	snapshot, err := repo.FindByEmail(ctx, authn.RealmIT, "it@example.test")
	require.NoError(t, err)
	prepared, err := sessionService.Prepare(authn.RealmIT, "it-1", now)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET active=false WHERE realm='it' AND subject_id='it-1'`)
	require.NoError(t, err)
	_, err = repo.CompleteLogin(ctx, snapshot, nil, prepared, now, func(accounts.Account) (accounts.MFAResult, error) {
		t.Fatal("inactive account must not reach MFA check")
		return accounts.MFAResult{}, nil
	})
	require.ErrorIs(t, err, accounts.ErrInvalid)
}
