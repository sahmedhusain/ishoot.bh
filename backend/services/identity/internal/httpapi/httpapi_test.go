package httpapi_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

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
	"platform.local/backend/services/identity/internal/guard"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/internal/tokens"
	"platform.local/backend/services/identity/migrations"
)

type testGuard struct{}

func (testGuard) Check(_ context.Context, _ authn.Realm, email, _ string) error {
	switch email {
	case "limited@example.test":
		return &guard.Limited{RetryAfter: time.Second}
	case "unavailable@example.test":
		return guard.ErrUnavailable
	}
	return nil
}

func TestSessionHTTP(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	svc, err := sessions.New(postgres.New(pool), time.Hour)
	require.NoError(t, err)
	_, private, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	issuer, err := tokens.New("https://identity.example", "active", private, time.Minute)
	require.NoError(t, err)
	caller := authntest.NewServiceSigner(t, "admin")
	verifier := authn.NewVerifier(time.Second, caller.Trust())
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "identity", "APP_ENV": "test"}))
	app, err := httpx.New(cfg, logx.New(io.Discard, logx.Options{}), nil)
	require.NoError(t, err)
	hasher, err := password.New(password.Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16})
	require.NoError(t, err)
	key := base64.StdEncoding.EncodeToString([]byte(strings.Repeat("a", 32)))
	ring, err := secrets.NewKeyring(secrets.Config{Keys: []string{"primary:" + key}, PrimaryKeyID: "primary"})
	require.NoError(t, err)
	otp, err := totp.New(totp.Config{Period: 30 * time.Second, Digits: 6, Window: 1})
	require.NoError(t, err)
	login, err := accounts.New(postgres.New(pool), hasher, ring, otp, svc, 2, testGuard{})
	require.NoError(t, err)
	httpapi.Register(app, verifier, svc, issuer, login, 4096)
	spec, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, spec.Validate(ctx))
	router, err := gorillamux.NewRouter(spec)
	require.NoError(t, err)
	serviceToken := caller.Sign(t, authntest.Token{Subject: "admin"})
	call := func(method, path, token string, body []byte) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		rec := httptest.NewRecorder()
		app.ServeHTTP(rec, req)
		route, params, err := router.FindRoute(httptest.NewRequest(method, "http://localhost"+path, nil))
		require.NoError(t, err)
		input := &openapi3filter.ResponseValidationInput{RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route, Options: &openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc}}, Status: rec.Code, Header: rec.Header(), Options: &openapi3filter.Options{IncludeResponseStatus: true}}
		input.SetBodyBytes(rec.Body.Bytes())
		require.NoError(t, openapi3filter.ValidateResponse(ctx, input), "response violates OpenAPI: %s", rec.Body.String())
		return rec
	}
	legacy, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,password_hash,roles) VALUES ('staff','login-user','login@example.test',$1,ARRAY['admin']), ('staff','staff-1','session@example.test',$1,ARRAY['viewer'])`, string(legacy))
	require.NoError(t, err)
	loginBody, _ := json.Marshal(map[string]string{"email": "login@example.test", "password": "correct-password"})
	loginPath := "/v1/identity/staff/sessions/login"
	require.Equal(t, 401, call(http.MethodPost, loginPath, "", loginBody).Code)
	loggedIn := call(http.MethodPost, loginPath, serviceToken, loginBody)
	require.Equal(t, 200, loggedIn.Code)
	require.Equal(t, "no-store", loggedIn.Header().Get("Cache-Control"))
	var loginResult struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
		SubjectID    string `json:"subjectId"`
	}
	require.NoError(t, json.Unmarshal(loggedIn.Body.Bytes(), &loginResult))
	require.Equal(t, "login-user", loginResult.SubjectID)
	require.NotEmpty(t, loginResult.RefreshToken)
	publicKeys, err := jwk.Parse(issuer.JWKS())
	require.NoError(t, err)
	userVerifier := authn.NewVerifier(time.Second, authn.Trust{Issuer: "https://identity.example", Keys: authn.StaticKeys{Set: publicKeys}, Realms: authn.UserRealms})
	principal, err := userVerifier.Verify(ctx, loginResult.AccessToken, authn.RealmStaff)
	require.NoError(t, err)
	require.Equal(t, "login-user", principal.Subject)
	require.Contains(t, principal.Roles, "admin")
	_, err = userVerifier.Verify(ctx, loginResult.AccessToken, authn.RealmCustomer)
	require.Error(t, err)
	refreshLogin, _ := json.Marshal(map[string]string{"refreshToken": loginResult.RefreshToken})
	refreshLoginResponse := call(http.MethodPost, "/v1/identity/staff/sessions/refresh", serviceToken, refreshLogin)
	require.Equal(t, 200, refreshLoginResponse.Code)
	var refreshed struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
	}
	require.NoError(t, json.Unmarshal(refreshLoginResponse.Body.Bytes(), &refreshed))
	require.NotEmpty(t, refreshed.AccessToken)
	require.NotEqual(t, loginResult.RefreshToken, refreshed.RefreshToken)
	refreshedPrincipal, err := userVerifier.Verify(ctx, refreshed.AccessToken, authn.RealmStaff)
	require.NoError(t, err)
	require.Equal(t, "login-user", refreshedPrincipal.Subject)
	wrongPassword, _ := json.Marshal(map[string]string{"email": "login@example.test", "password": "wrong"})
	require.Equal(t, 401, call(http.MethodPost, loginPath, serviceToken, wrongPassword).Code)
	limited, _ := json.Marshal(map[string]string{"email": "limited@example.test", "password": "wrong"})
	limitedResponse := call(http.MethodPost, loginPath, serviceToken, limited)
	require.Equal(t, 429, limitedResponse.Code)
	require.Equal(t, "1", limitedResponse.Header().Get("Retry-After"))
	unavailable, _ := json.Marshal(map[string]string{"email": "unavailable@example.test", "password": "wrong"})
	require.Equal(t, 503, call(http.MethodPost, loginPath, serviceToken, unavailable).Code)
	jwks := call(http.MethodGet, "/.well-known/jwks.json", "", nil)
	require.Equal(t, 200, jwks.Code)
	require.NotContains(t, jwks.Body.String(), `"d"`)
	cred, err := svc.Start(ctx, authn.RealmStaff, "staff-1", time.Now())
	require.NoError(t, err)
	body, _ := json.Marshal(map[string]string{"refreshToken": cred.Token})
	path := "/v1/identity/staff/sessions/refresh"
	require.Equal(t, 401, call(http.MethodPost, path, "", body).Code)
	wrong := call(http.MethodPost, "/v1/identity/customer/sessions/refresh", serviceToken, body)
	require.Equal(t, 401, wrong.Code)
	ok := call(http.MethodPost, path, serviceToken, body)
	require.Equal(t, 200, ok.Code)
	require.Equal(t, "no-store", ok.Header().Get("Cache-Control"))
	var response struct {
		RefreshToken string `json:"refreshToken"`
		SessionID    string `json:"sessionId"`
	}
	require.NoError(t, json.Unmarshal(ok.Body.Bytes(), &response))
	require.Equal(t, cred.Family.ID, response.SessionID)
	replay := call(http.MethodPost, path, serviceToken, body)
	require.Equal(t, 401, replay.Code)
	require.Equal(t, "application/problem+json", replay.Header().Get("Content-Type"))
	next, _ := json.Marshal(map[string]string{"refreshToken": response.RefreshToken})
	require.Equal(t, 401, call(http.MethodPost, path, serviceToken, next).Code)
	require.Equal(t, 400, call(http.MethodPost, "/v1/identity/service/sessions/refresh", serviceToken, body).Code)
	require.Equal(t, 400, call(http.MethodPost, path, serviceToken, []byte(`{"refreshToken":"x","other":1}`)).Code)
	fresh, err := svc.Start(ctx, authn.RealmIT, "it-1", time.Now())
	require.NoError(t, err)
	logout, _ := json.Marshal(map[string]string{"refreshToken": fresh.Token})
	require.Equal(t, 204, call(http.MethodPost, "/v1/identity/it/sessions/logout", serviceToken, logout).Code)
	_, err = svc.Active(ctx, authn.RealmIT, fresh.Family.ID, time.Now())
	require.ErrorIs(t, err, sessions.ErrInvalid)
}
