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
func (allowGuard) Check(context.Context, authn.Realm, string, string) error	{ return nil }
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
	const legacyMFA = "MTIzNDU2Nzg5MDEy.WAqUAxCQ3k3ssm1UH8s12w==.KMdZE+lMPbU7vI5DnqCbdg=="
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,username,password_hash,roles,mfa_enabled,mfa_secret_encrypted) VALUES ('staff','user-123','alice@example.test','ALICE',$1,ARRAY['admin'],true,$2),('customer','customer-1','alice@example.test',NULL,NULL,ARRAY[]::text[],false,NULL)`, string(legacy), legacyMFA)
	require.NoError(t, err)
	input := accounts.Input{Realm: authn.RealmStaff, Email: "  Alice  ", Password: "correct-password"}
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmStaff, Email: "alice@example.test", Password: "correct-password"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid, "staff login must reject email address")
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmStaff, Email: "missing-user", Password: "anything"}, now)
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
	stronger, err := hasher.Hash("it-password")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,username,password_hash) VALUES ('it','it-1','it@example.test','IT-1',$1)`, stronger)
	require.NoError(t, err)
	it := accounts.Input{Realm: authn.RealmIT, Email: "it-1", Password: "it-password"}
	secret, err := ring.Seal([]byte("12345678901234567890"), "it-1")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET mfa_enabled=true,mfa_secret_encrypted=$1 WHERE realm='it' AND subject_id='it-1'`, secret)
	require.NoError(t, err)
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmIT, Email: "it@example.test", Password: "it-password"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid, "IT login must reject email address")
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
	snapshot, err := repo.FindByEmail(ctx, authn.RealmIT, "it-1")
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

func TestEnvBootstrapLazyMaterializationAndDualRealmPasswords(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	hasher, err := password.New(password.Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16})
	require.NoError(t, err)
	adminHash, err := hasher.Hash("Admin12345678!")
	require.NoError(t, err)
	itHash, err := hasher.Hash("ITAdmin12345678!")
	require.NoError(t, err)
	primaryKey := base64.StdEncoding.EncodeToString([]byte(strings.Repeat("a", 32)))
	ring, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + primaryKey}, PrimaryKeyID: "primary"})
	require.NoError(t, err)
	otp, err := totp.New(totp.Config{Period: 30 * time.Second, Digits: 6, Window: 1})
	require.NoError(t, err)
	repo := postgres.New(pool).WithBootstrap(
		postgres.BootstrapAccount{Realm: authn.RealmStaff, SubjectID: "super-admin", Username: "BA0001", Email: "ops@example.test", PasswordHash: adminHash, DisplayName: "Super Admin", Roles: []string{"super_admin"}},
		postgres.BootstrapAccount{Realm: authn.RealmIT, SubjectID: "430c4105-6360-4415-bf1b-087d582c7fc6", Username: "IT0001", Email: "ops@example.test", PasswordHash: itHash, Roles: []string{"it_admin"}},
	)
	sessionService, err := sessions.New(repo, time.Hour)
	require.NoError(t, err)
	svc, err := accounts.New(repo, hasher, ring, otp, sessionService, 2, allowGuard{}, accounts.MFAConfig{EnrollmentTTL: 10 * time.Minute, RecoveryCount: 10, Digits: 6, Period: 30 * time.Second})
	require.NoError(t, err)
	now := time.Now().UTC().Truncate(time.Second)

	var initialRows int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account`).Scan(&initialRows))
	require.Equal(t, 0, initialRows, "bootstrap users must not exist in SQL until first auth")

	// IT0001 first-launch sign-in works without MFA, and rejects email sign-in.
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmIT, Email: "ops@example.test", Password: "ITAdmin12345678!"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid)
	itSignedIn, err := svc.Login(ctx, accounts.Input{Realm: authn.RealmIT, Email: "it0001", Password: "ITAdmin12345678!"}, now)
	require.NoError(t, err)
	require.False(t, itSignedIn.Account.MFAEnabled)
	itPrincipal := authn.Principal{Realm: authn.RealmIT, Subject: itSignedIn.Account.SubjectID, SessionID: itSignedIn.Credential.Family.ID, Roles: itSignedIn.Account.Roles}

	// IT cannot change password to match BA0001's password (even while BA0001 is still only in env!).
	err = svc.ChangePassword(ctx, itPrincipal, "ITAdmin12345678!", "Admin12345678!", "", "", 14, now)
	require.ErrorIs(t, err, accounts.ErrSamePasswordOtherRealm)

	// IT can change password to a new distinct password, and enroll TOTP afterwards.
	err = svc.ChangePassword(ctx, itPrincipal, "ITAdmin12345678!", "NewITPass123456!", "", "", 14, now)
	require.NoError(t, err)
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmIT, Email: "IT0001", Password: "ITAdmin12345678!"}, now)
	require.ErrorIs(t, err, accounts.ErrInvalid, "old env password must stop working once DB password changes")
	itSignedIn2, err := svc.Login(ctx, accounts.Input{Realm: authn.RealmIT, Email: "IT0001", Password: "NewITPass123456!"}, now)
	require.NoError(t, err)
	itPrincipal2 := authn.Principal{Realm: authn.RealmIT, Subject: itSignedIn2.Account.SubjectID, SessionID: itSignedIn2.Credential.Family.ID, Roles: itSignedIn2.Account.Roles}
	enrollment, err := svc.BeginMFA(ctx, itPrincipal2, "NewITPass123456!", "", now)
	require.NoError(t, err)
	totpCode, err := otp.Code([]byte(strings.Repeat("a", 20)), now.Unix()/30)
	_ = totpCode
	require.NotEmpty(t, enrollment.Secret)

	// BA0001 sign-in materializes staff account + staff_access without MFA.
	adminSignedIn, err := svc.Login(ctx, accounts.Input{Realm: authn.RealmStaff, Email: "ba0001", Password: "Admin12345678!"}, now)
	require.NoError(t, err)
	require.Equal(t, "super-admin", adminSignedIn.Account.SubjectID)
	require.False(t, adminSignedIn.Account.MFAEnabled)
}
