package bootstrap_test

import (
	"context"
	"encoding/base32"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/santhosh-tekuri/jsonschema/v6"
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
	limited := input("it@example.test")
	limited.Role = "it_support"
	_, err := bootstrap.CreateITAdmin(context.Background(), nil, nil, nil, limited, time.Now())
	require.ErrorContains(t, err, "first IT account")
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

	p := authn.Principal{Realm: authn.RealmIT, Subject: result.SubjectID, SessionID: signedIn.Credential.Family.ID, Roles: []string{"it_admin"}}
	_, err = svc.BeginMFA(ctx, p, login.Password, "", now)
	require.NoError(t, err)
	require.NoError(t, svc.CancelMFA(ctx, p, login.Password, "", now))
	_, err = svc.BeginMFA(ctx, p, login.Password, "", now)
	require.NoError(t, err)

	in := input(email)
	in.Password = "a different long password"
	_, err = bootstrap.RecoverITAdmin(ctx, pool, hasher, ring, in, now, "")
	require.ErrorContains(t, err, "operator ID")
	_, err = bootstrap.RecoverITAdmin(ctx, pool, hasher, ring, input("missing@example.test"), now, "operator-123")
	require.ErrorIs(t, err, bootstrap.ErrRecoveryTarget)
	for _, update := range []string{`active=false`, `active=true,roles=ARRAY['it_support']`} {
		_, err = pool.Exec(ctx, `UPDATE identity.account SET `+update+` WHERE realm='it'`)
		require.NoError(t, err)
		_, err = bootstrap.RecoverITAdmin(ctx, pool, hasher, ring, in, now, "operator-123")
		require.ErrorIs(t, err, bootstrap.ErrRecoveryTarget)
	}
	_, err = pool.Exec(ctx, `UPDATE identity.account SET active=true,roles=ARRAY['it_admin'] WHERE realm='it'`)
	require.NoError(t, err)

	// If the audit write fails, the previous credentials, factor, recovery codes and sessions survive.
	_, err = pool.Exec(ctx, `CREATE FUNCTION identity.refuse_recovery() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN IF NEW.subject='identity.user.recovered' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER refuse_recovery BEFORE INSERT ON identity.outbox FOR EACH ROW EXECUTE FUNCTION identity.refuse_recovery()`)
	require.NoError(t, err)
	_, err = bootstrap.RecoverITAdmin(ctx, pool, hasher, ring, in, now, "operator-123")
	require.ErrorContains(t, err, "audit unavailable")
	require.NoError(t, svc.ValidateSession(ctx, p, now))
	unchanged, err := repo.FindBySubject(ctx, authn.RealmIT, result.SubjectID)
	require.NoError(t, err)
	_, err = hasher.Verify(login.Password, *unchanged.PasswordHash)
	require.NoError(t, err)
	require.NotNil(t, unchanged.PendingSecret)
	_, err = pool.Exec(ctx, `DROP TRIGGER refuse_recovery ON identity.outbox; DROP FUNCTION identity.refuse_recovery()`)
	require.NoError(t, err)

	recovered, err := bootstrap.RecoverITAdmin(ctx, pool, hasher, ring, in, now, "operator-123")
	require.NoError(t, err)
	require.Equal(t, result.SubjectID, recovered.SubjectID)
	require.NotEqual(t, result.Secret, recovered.Secret)
	require.NotEqual(t, result.RecoveryCodes, recovered.RecoveryCodes)
	require.ErrorIs(t, svc.ValidateSession(ctx, p, now), accounts.ErrInvalid)
	_, err = svc.Refresh(ctx, authn.RealmIT, signedIn.Credential.Token, now)
	require.ErrorIs(t, err, sessions.ErrInvalid)
	_, err = svc.Login(ctx, login, now)
	require.ErrorIs(t, err, accounts.ErrInvalid, "old password must not work")
	login.Password, login.OTP = in.Password, result.RecoveryCodes[0]
	_, err = svc.Login(ctx, login, now)
	require.ErrorIs(t, err, accounts.ErrInvalid, "old recovery codes must not work")
	login.OTP = recovered.RecoveryCodes[0]
	signedIn, err = svc.Login(ctx, login, now)
	require.NoError(t, err)
	assert.Nil(t, signedIn.Account.PendingSecret)
	assert.Nil(t, signedIn.Account.LastStep)
	assert.True(t, signedIn.Account.MFAEnabled)
	rotated, err := svc.Refresh(ctx, authn.RealmIT, signedIn.Credential.Token, now)
	require.NoError(t, err)
	require.NoError(t, sessionService.Logout(ctx, authn.RealmIT, rotated.Credential.Token, now))
	require.NoError(t, sessionService.Logout(ctx, authn.RealmIT, rotated.Credential.Token, now))

	rows, err := pool.Query(ctx, `SELECT subject,payload FROM identity.outbox ORDER BY created_at,id`)
	require.NoError(t, err)
	defer rows.Close()
	counts := map[string]int{}
	for rows.Next() {
		var subject string
		var raw []byte
		require.NoError(t, rows.Scan(&subject, &raw))
		counts[subject]++
		var doc, body any
		schemaFile := "../../../../../contracts/events/" + subject + ".v1.json"
		schemaBytes, err := os.ReadFile(schemaFile)
		require.NoError(t, err)
		require.NoError(t, json.Unmarshal(schemaBytes, &doc))
		require.NoError(t, json.Unmarshal(raw, &body))
		compiler := jsonschema.NewCompiler()
		compiler.AssertFormat()
		require.NoError(t, compiler.AddResource("https://platform.local/event.json", doc))
		schema, err := compiler.Compile("https://platform.local/event.json")
		require.NoError(t, err)
		require.NoError(t, schema.Validate(body))
		for _, secret := range []string{email, login.Password, result.Secret, recovered.Secret, result.RecoveryCodes[0], recovered.RecoveryCodes[0], signedIn.Credential.Token} {
			assert.NotContains(t, string(raw), secret)
		}
		if subject == "identity.user.recovered" {
			assert.Contains(t, string(raw), `"changedBy": "operator:operator-123"`)
		}
	}
	require.NoError(t, rows.Err())
	assert.Equal(t, map[string]int{"identity.user.created": 1, "identity.user.recovered": 1, "identity.session.started": 2,
		"identity.session.rotated": 1, "identity.session.revoked": 1, "identity.mfa.changed": 3}, counts)
}
