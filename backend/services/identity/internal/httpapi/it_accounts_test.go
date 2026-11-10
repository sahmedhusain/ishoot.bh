package httpapi_test
import (
	"bytes"
	"context"
	"encoding/base32"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/santhosh-tekuri/jsonschema/v6"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/api"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)
func TestITAccountAdministration(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	hasher, err := password.New(password.Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16})
	require.NoError(t, err)
	ring, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + base64.StdEncoding.EncodeToString([]byte(strings.Repeat("a", 32)))}, PrimaryKeyID: "primary"})
	require.NoError(t, err)
	defaults := bootstrap.Input{Email: "admin@example.test", Password: "a long enough password", Role: "it_admin", MinPasswordLength: 14,
		RecoveryCount:	3, Issuer: "Platform IT", Digits: 6, Period: 30 * time.Second}
	root, err := bootstrap.CreateITAdmin(ctx, pool, hasher, ring, defaults, time.Now())
	require.NoError(t, err)
	sessionService, err := sessions.New(postgres.New(pool), time.Hour)
	require.NoError(t, err)
	credential, err := sessionService.Start(ctx, authn.RealmIT, root.SubjectID, time.Now())
	require.NoError(t, err)
	principal := authn.Principal{Realm: authn.RealmIT, Subject: root.SubjectID, SessionID: credential.Family.ID, Roles: []string{"it_admin"}}
	signer := authntest.NewSigner(t, "identity")
	token := signer.Sign(t, authntest.Token{Realm: principal.Realm, Subject: principal.Subject, SessionID: principal.SessionID, Roles: principal.Roles})
	manager := app.NewITAccounts(pool, hasher, ring, defaults, 2)
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "identity", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logx.New(io.Discard, logx.Options{}), nil)
	require.NoError(t, err)
	httpapi.RegisterITAccounts(e, authn.NewVerifier(time.Second, signer.Trust()), manager, 4096)
	spec, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	router, err := gorillamux.NewRouter(spec)
	require.NoError(t, err)
	call := func(method, path, bearer string, body any) *httptest.ResponseRecorder {
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		req := httptest.NewRequest(method, "http://localhost"+path, bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		route, params, err := router.FindRoute(req)
		require.NoError(t, err)
		input := &openapi3filter.ResponseValidationInput{RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route}, Status: rec.Code, Header: rec.Header()}
		input.SetBodyBytes(rec.Body.Bytes())
		require.NoError(t, openapi3filter.ValidateResponse(ctx, input), "response violates OpenAPI: %s", rec.Body)
		require.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
		return rec
	}
	const path = "/v1/identity/desk/it-accounts"
	require.Equal(t, 401, call(http.MethodGet, path, "", nil).Code)
	for _, role := range []string{"it_engineer", "it_support", "it_auditor"} {
		denied := signer.Sign(t, authntest.Token{Realm: authn.RealmIT, Roles: []string{role}})
		require.Equal(t, 403, call(http.MethodGet, path, denied, nil).Code)
		require.Equal(t, 403, call(http.MethodPost, path, denied, map[string]any{}).Code)
	}
	staff := signer.Sign(t, authntest.Token{Realm: authn.RealmStaff, Roles: []string{"it_admin"}})
	require.Equal(t, 401, call(http.MethodGet, path, staff, nil).Code)
	stale := signer.Sign(t, authntest.Token{Realm: authn.RealmIT, Subject: root.SubjectID, SessionID: "invalid", Roles: principal.Roles})
	require.Equal(t, 401, call(http.MethodGet, path, stale, nil).Code)
	for _, query := range []string{"?limit=0", "?limit=201", "?limit=no", "?cursor=" + strings.Repeat("x", 201)} {
		require.Equal(t, 422, call(http.MethodGet, path+query, token, nil).Code)
	}
	for _, body := range []map[string]any{
		{"role": "it_support", "active": false}, {"role": "it_admin", "active": false},
	} {
		require.Equal(t, 409, call(http.MethodPut, path+"/"+root.SubjectID, token, body).Code)
	}
	create := map[string]any{"email": " New@Example.test ", "password": "new long enough password", "role": "it_support"}
	created := call(http.MethodPost, path, token, create)
	require.Equal(t, 201, created.Code, created.Body.String())
	var result bootstrap.Result
	require.NoError(t, json.Unmarshal(created.Body.Bytes(), &result))
	require.Len(t, result.RecoveryCodes, 3)
	require.NotEqual(t, root.Secret, result.Secret)
	require.NotEqual(t, root.RecoveryCodes, result.RecoveryCodes)
	require.Contains(t, result.OTPAuthURL, result.Secret)
	require.Equal(t, 409, call(http.MethodPost, path, token, create).Code)
	require.Equal(t, 422, call(http.MethodPost, path, token, map[string]any{"email": "bad", "password": "short", "role": "admin"}).Code)
	require.Equal(t, 422, call(http.MethodPut, path+"/"+result.SubjectID, token, map[string]any{"role": "it_admin"}).Code)
	require.Equal(t, 400, call(http.MethodPut, path+"/"+result.SubjectID, token, map[string]any{"role": "it_admin", "active": true, "password": "unexpected"}).Code)
	require.Equal(t, 404, call(http.MethodPut, path+"/missing", token, map[string]any{"role": "it_admin", "active": true}).Code)
	listed := call(http.MethodGet, path+"?limit=1", token, nil)
	require.Equal(t, 200, listed.Code)
	var page app.ITAccountPage
	require.NoError(t, json.Unmarshal(listed.Body.Bytes(), &page))
	require.Len(t, page.Items, 1)
	require.NotEmpty(t, page.NextCursor)
	require.Equal(t, 14, page.PasswordMinLength)
	second := call(http.MethodGet, path+"?cursor="+page.NextCursor, token, nil)
	require.Equal(t, 200, second.Code)
	require.NotContains(t, second.Body.String(), result.Secret)
	require.NotContains(t, second.Body.String(), "passwordHash")
	require.NotContains(t, second.Body.String(), "recoveryCodes")
	otp, err := totp.New(totp.Config{Period: 30 * time.Second, Digits: 6, Window: 1})
	require.NoError(t, err)
	authentication, err := accounts.New(postgres.New(pool), hasher, ring, otp, sessionService, 2, testGuard{}, accounts.MFAConfig{EnrollmentTTL: time.Minute, RecoveryCount: 3, Digits: 6, Period: 30 * time.Second})
	require.NoError(t, err)
	secret, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(result.Secret)
	require.NoError(t, err)
	code, err := otp.Code(secret, time.Now().Unix()/30)
	require.NoError(t, err)
	member, err := authentication.Login(ctx, accounts.Input{Realm: authn.RealmIT, Email: "new@example.test", Password: create["password"].(string), OTP: code}, time.Now())
	require.NoError(t, err)
	memberSession := member.Credential
	_, err = pool.Exec(ctx, `CREATE FUNCTION identity.refuse_access_change() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN IF NEW.subject='identity.user.changed' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER refuse_access_change BEFORE INSERT ON identity.outbox FOR EACH ROW EXECUTE FUNCTION identity.refuse_access_change()`)
	require.NoError(t, err)
	require.Equal(t, 500, call(http.MethodPut, path+"/"+result.SubjectID, token, map[string]any{"role": "it_admin", "active": true}).Code)
	_, err = sessionService.Active(ctx, authn.RealmIT, memberSession.Family.ID, time.Now())
	require.NoError(t, err, "failed audit must not revoke a session")
	_, err = pool.Exec(ctx, `DROP TRIGGER refuse_access_change ON identity.outbox; DROP FUNCTION identity.refuse_access_change()`)
	require.NoError(t, err)
	require.Equal(t, 204, call(http.MethodPut, path+"/"+result.SubjectID, token, map[string]any{"role": "it_admin", "active": true}).Code)
	_, err = sessionService.Active(ctx, authn.RealmIT, memberSession.Family.ID, time.Now())
	require.ErrorIs(t, err, sessions.ErrInvalid)
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for _, id := range []string{root.SubjectID, result.SubjectID} {
		wg.Go(func() { results <- manager.Update(ctx, principal, id, "it_support", true, nil) })
	}
	wg.Wait()
	close(results)
	var successes int
	for err := range results {
		if err == nil {
			successes++
		} else {
			require.True(t, errors.Is(err, app.ErrLastAdmin) || errors.Is(err, accounts.ErrInvalid), "%v", err)
		}
	}
	require.Equal(t, 1, successes)
	var admins int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.account WHERE realm='it' AND active AND roles @> ARRAY['it_admin']`).Scan(&admins))
	require.Equal(t, 1, admins)
	var payload []byte
	require.NoError(t, pool.QueryRow(ctx, `SELECT payload FROM identity.outbox WHERE subject='identity.user.changed' LIMIT 1`).Scan(&payload))
	rawSchema, err := os.ReadFile("../../../../contracts/events/identity.user.changed.v1.json")
	require.NoError(t, err)
	var schemaDoc, event any
	require.NoError(t, json.Unmarshal(rawSchema, &schemaDoc))
	require.NoError(t, json.Unmarshal(payload, &event))
	compiler := jsonschema.NewCompiler()
	require.NoError(t, compiler.AddResource("https://platform.local/event.json", schemaDoc))
	schema, err := compiler.Compile("https://platform.local/event.json")
	require.NoError(t, err)
	require.NoError(t, schema.Validate(event))
	require.NotContains(t, string(payload), "new@example.test")
	require.NotContains(t, string(payload), result.Secret)
}
