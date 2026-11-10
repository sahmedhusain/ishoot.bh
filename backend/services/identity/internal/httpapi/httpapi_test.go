package httpapi_test
import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base32"
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
	itCaller := authntest.NewServiceSigner(t, "it")
	webCaller := authntest.NewServiceSigner(t, "web")
	webKey, found := webCaller.Public.Key(0)
	require.True(t, found)
	require.NoError(t, caller.Public.AddKey(webKey))
	itKey, found := itCaller.Public.Key(0)
	require.True(t, found)
	require.NoError(t, caller.Public.AddKey(itKey))
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
	login, err := accounts.New(postgres.New(pool), hasher, ring, otp, svc, 2, testGuard{}, accounts.MFAConfig{EnrollmentTTL: 10 * time.Minute, RecoveryCount: 10, Digits: 6, Period: 30 * time.Second})
	require.NoError(t, err)
	httpapi.Register(app, verifier, svc, issuer, login, 4096, map[authn.Realm][]string{authn.RealmStaff: {"admin"}, authn.RealmCustomer: {"web"}, authn.RealmIT: {"it"}})
	spec, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, spec.Validate(ctx))
	router, err := gorillamux.NewRouter(spec)
	require.NoError(t, err)
	serviceToken := caller.Sign(t, authntest.Token{Subject: "admin"})
	itToken := itCaller.Sign(t, authntest.Token{Subject: "it"})
	webToken := webCaller.Sign(t, authntest.Token{Subject: "web"})
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
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,password_hash,roles) VALUES ('staff','login-user','login@example.test',$1,ARRAY['admin']), ('staff','staff-1','session@example.test',$1,ARRAY['viewer']), ('customer','customer-1','customer@example.test',$1,ARRAY[]::text[])`, string(legacy))
	require.NoError(t, err)
	loginBody, _ := json.Marshal(map[string]string{"email": "login@example.test", "password": "correct-password"})
	loginPath := "/v1/identity/staff/sessions/login"
	require.Equal(t, 401, call(http.MethodPost, loginPath, itToken, loginBody).Code)
	customerBody, _ := json.Marshal(map[string]string{"email": "customer@example.test", "password": "correct-password"})
	customerPath := "/v1/identity/customer/sessions/login"
	require.Equal(t, 401, call(http.MethodPost, customerPath, serviceToken, customerBody).Code)
	require.Equal(t, 200, call(http.MethodPost, customerPath, webToken, customerBody).Code)
	require.Equal(t, 401, call(http.MethodPost, loginPath, "", loginBody).Code)
	loggedIn := call(http.MethodPost, loginPath, serviceToken, loginBody)
	require.Equal(t, 200, loggedIn.Code)
	require.Equal(t, "no-store", loggedIn.Header().Get("Cache-Control"))
	var loginResult struct {
		AccessToken	string	`json:"accessToken"`
		RefreshToken	string	`json:"refreshToken"`
		SubjectID	string	`json:"subjectId"`
	}
	require.NoError(t, json.Unmarshal(loggedIn.Body.Bytes(), &loginResult))
	require.Equal(t, "login-user", loginResult.SubjectID)
	require.NotEmpty(t, loginResult.RefreshToken)
	statusPath := "/v1/identity/session"
	require.Equal(t, 401, call(http.MethodGet, statusPath, serviceToken, nil).Code)
	activeStatus := call(http.MethodGet, statusPath, loginResult.AccessToken, nil)
	require.Equal(t, 204, activeStatus.Code)
	require.Equal(t, "no-store", activeStatus.Header().Get("Cache-Control"))
	_, err = pool.Exec(ctx, `UPDATE identity.account SET roles=ARRAY['viewer'] WHERE realm='staff' AND subject_id='login-user'`)
	require.NoError(t, err)
	require.Equal(t, 401, call(http.MethodGet, statusPath, loginResult.AccessToken, nil).Code)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET roles=ARRAY['admin'],active=false WHERE realm='staff' AND subject_id='login-user'`)
	require.NoError(t, err)
	require.Equal(t, 401, call(http.MethodGet, statusPath, loginResult.AccessToken, nil).Code)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET active=true WHERE realm='staff' AND subject_id='login-user'`)
	require.NoError(t, err)
	require.Equal(t, 204, call(http.MethodGet, statusPath, loginResult.AccessToken, nil).Code)
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
		AccessToken	string	`json:"accessToken"`
		RefreshToken	string	`json:"refreshToken"`
	}
	require.NoError(t, json.Unmarshal(refreshLoginResponse.Body.Bytes(), &refreshed))
	require.NotEmpty(t, refreshed.AccessToken)
	require.NotEqual(t, loginResult.RefreshToken, refreshed.RefreshToken)
	refreshedPrincipal, err := userVerifier.Verify(ctx, refreshed.AccessToken, authn.RealmStaff)
	require.NoError(t, err)
	require.Equal(t, "login-user", refreshedPrincipal.Subject)
	loginLogout, _ := json.Marshal(map[string]string{"refreshToken": refreshed.RefreshToken})
	require.Equal(t, 204, call(http.MethodPost, "/v1/identity/staff/sessions/logout", serviceToken, loginLogout).Code)
	require.Equal(t, 401, call(http.MethodGet, statusPath, refreshed.AccessToken, nil).Code)
	second := call(http.MethodPost, loginPath, serviceToken, loginBody)
	require.Equal(t, 200, second.Code)
	var secondLogin struct {
		AccessToken	string	`json:"accessToken"`
		RefreshToken	string	`json:"refreshToken"`
	}
	require.NoError(t, json.Unmarshal(second.Body.Bytes(), &secondLogin))
	oldRefresh, _ := json.Marshal(map[string]string{"refreshToken": secondLogin.RefreshToken})
	require.Equal(t, 200, call(http.MethodPost, "/v1/identity/staff/sessions/refresh", serviceToken, oldRefresh).Code)
	require.Equal(t, 401, call(http.MethodPost, "/v1/identity/staff/sessions/refresh", serviceToken, oldRefresh).Code)
	require.Equal(t, 401, call(http.MethodGet, statusPath, secondLogin.AccessToken, nil).Code)
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
		RefreshToken	string	`json:"refreshToken"`
		SessionID	string	`json:"sessionId"`
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
	require.Equal(t, 401, call(http.MethodPost, "/v1/identity/it/sessions/logout", serviceToken, logout).Code)
	require.Equal(t, 204, call(http.MethodPost, "/v1/identity/it/sessions/logout", itToken, logout).Code)
	_, err = svc.Active(ctx, authn.RealmIT, fresh.Family.ID, time.Now())
	require.ErrorIs(t, err, sessions.ErrInvalid)
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,password_hash,roles) VALUES ('staff','mfa-user','mfa@example.test',$1,ARRAY['admin'])`, string(legacy))
	require.NoError(t, err)
	mfaLoginBody, _ := json.Marshal(map[string]string{"email": "mfa@example.test", "password": "correct-password"})
	mfaLogin := call(http.MethodPost, loginPath, serviceToken, mfaLoginBody)
	require.Equal(t, 200, mfaLogin.Code)
	var mfaSession struct {
		AccessToken string `json:"accessToken"`
	}
	require.NoError(t, json.Unmarshal(mfaLogin.Body.Bytes(), &mfaSession))
	mfaPath := "/v1/identity/mfa/enrollment"
	wrongMFA, _ := json.Marshal(map[string]string{"password": "wrong"})
	require.Equal(t, 401, call(http.MethodPost, mfaPath, mfaSession.AccessToken, wrongMFA).Code)
	mfaPassword, _ := json.Marshal(map[string]string{"password": "correct-password"})
	begin := call(http.MethodPost, mfaPath, mfaSession.AccessToken, mfaPassword)
	require.Equal(t, 200, begin.Code)
	require.Equal(t, "no-store", begin.Header().Get("Cache-Control"))
	var setup struct {
		Secret		string	`json:"secret"`
		Digits		int	`json:"digits"`
		PeriodSeconds	int64	`json:"periodSeconds"`
	}
	require.NoError(t, json.Unmarshal(begin.Body.Bytes(), &setup))
	require.Equal(t, 6, setup.Digits)
	require.EqualValues(t, 30, setup.PeriodSeconds)
	var encrypted string
	require.NoError(t, pool.QueryRow(ctx, `SELECT mfa_pending_secret_encrypted FROM identity.account WHERE subject_id='mfa-user'`).Scan(&encrypted))
	require.NotContains(t, encrypted, setup.Secret)
	initialSecret, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(setup.Secret)
	require.NoError(t, err)
	initialCode, err := otp.Code(initialSecret, time.Now().Unix()/30)
	require.NoError(t, err)
	initialConfirmation, _ := json.Marshal(map[string]string{"password": "correct-password", "code": initialCode})
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	_, err = tx.Exec(ctx, `UPDATE identity.account SET mfa_pending_expires_at=clock_timestamp()+interval '1 second' WHERE subject_id='mfa-user'`)
	require.NoError(t, err)
	blocked := make(chan *httptest.ResponseRecorder, 1)
	go func() {
		req := httptest.NewRequest(http.MethodPost, mfaPath+"/confirm", bytes.NewReader(initialConfirmation))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+mfaSession.AccessToken)
		rec := httptest.NewRecorder()
		app.ServeHTTP(rec, req)
		blocked <- rec
	}()
	time.Sleep(1500 * time.Millisecond)
	require.NoError(t, tx.Commit(ctx))
	require.Equal(t, 401, (<-blocked).Code, "an enrollment that expires while waiting for the account lock is rejected")
	require.Equal(t, 204, call(http.MethodDelete, mfaPath, mfaSession.AccessToken, mfaPassword).Code)
	require.Equal(t, 401, call(http.MethodPost, mfaPath+"/confirm", mfaSession.AccessToken, initialConfirmation).Code)
	begin = call(http.MethodPost, mfaPath, mfaSession.AccessToken, mfaPassword)
	require.Equal(t, 200, begin.Code)
	require.NoError(t, json.Unmarshal(begin.Body.Bytes(), &setup))
	secret, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(setup.Secret)
	require.NoError(t, err)
	newCode, err := otp.Code(secret, time.Now().Unix()/30)
	require.NoError(t, err)
	confirmBody, _ := json.Marshal(map[string]string{"password": "correct-password", "code": newCode})
	confirmed := call(http.MethodPost, mfaPath+"/confirm", mfaSession.AccessToken, confirmBody)
	require.Equal(t, 200, confirmed.Code)
	var recovery struct {
		RecoveryCodes []string `json:"recoveryCodes"`
	}
	require.NoError(t, json.Unmarshal(confirmed.Body.Bytes(), &recovery))
	require.Len(t, recovery.RecoveryCodes, 10)
	require.Equal(t, 401, call(http.MethodGet, statusPath, mfaSession.AccessToken, nil).Code)
	loginWithRecovery, _ := json.Marshal(map[string]string{"email": "mfa@example.test", "password": "correct-password", "otp": recovery.RecoveryCodes[0]})
	relogged := call(http.MethodPost, loginPath, serviceToken, loginWithRecovery)
	require.Equal(t, 200, relogged.Code)
	require.Equal(t, 401, call(http.MethodPost, loginPath, serviceToken, loginWithRecovery).Code)
	require.NoError(t, json.Unmarshal(relogged.Body.Bytes(), &mfaSession))
	begin = call(http.MethodPost, mfaPath, mfaSession.AccessToken, mfaPassword)
	require.Equal(t, 200, begin.Code)
	require.NoError(t, json.Unmarshal(begin.Body.Bytes(), &setup))
	secret, err = base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(setup.Secret)
	require.NoError(t, err)
	newCode, err = otp.Code(secret, time.Now().Unix()/30)
	require.NoError(t, err)
	confirmBody, _ = json.Marshal(map[string]string{"password": "correct-password", "code": newCode})
	require.Equal(t, 401, call(http.MethodPost, mfaPath+"/confirm", mfaSession.AccessToken, confirmBody).Code)
	confirmBody, _ = json.Marshal(map[string]string{"password": "correct-password", "code": newCode, "currentCode": recovery.RecoveryCodes[1]})
	confirmed = call(http.MethodPost, mfaPath+"/confirm", mfaSession.AccessToken, confirmBody)
	require.Equal(t, 200, confirmed.Code)
	require.NoError(t, json.Unmarshal(confirmed.Body.Bytes(), &recovery))
	require.Len(t, recovery.RecoveryCodes, 10)
	loginWithRecovery, _ = json.Marshal(map[string]string{"email": "mfa@example.test", "password": "correct-password", "otp": recovery.RecoveryCodes[0]})
	relogged = call(http.MethodPost, loginPath, serviceToken, loginWithRecovery)
	require.Equal(t, 200, relogged.Code)
	require.NoError(t, json.Unmarshal(relogged.Body.Bytes(), &mfaSession))
	disableBody, _ := json.Marshal(map[string]string{"password": "correct-password", "code": recovery.RecoveryCodes[1]})
	require.Equal(t, 204, call(http.MethodPost, "/v1/identity/mfa/disable", mfaSession.AccessToken, disableBody).Code)
	require.Equal(t, 401, call(http.MethodGet, statusPath, mfaSession.AccessToken, nil).Code)
	require.Equal(t, 200, call(http.MethodPost, loginPath, serviceToken, mfaLoginBody).Code)
	itSecret := []byte("12345678901234567890")
	itEncrypted, err := ring.Seal(itSecret, "it-mfa-user")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO identity.account (realm,subject_id,email,password_hash,roles,mfa_enabled,mfa_secret_encrypted) VALUES ('it','it-mfa-user','it-mfa@example.test',$1,ARRAY['it_admin'],true,$2)`, string(legacy), itEncrypted)
	require.NoError(t, err)
	itCode, err := otp.Code(itSecret, time.Now().Unix()/30)
	require.NoError(t, err)
	itLoginBody, _ := json.Marshal(map[string]string{"email": "it-mfa@example.test", "password": "correct-password", "otp": itCode})
	itLogin := call(http.MethodPost, "/v1/identity/it/sessions/login", itToken, itLoginBody)
	require.Equal(t, 200, itLogin.Code)
	var itSession struct {
		AccessToken string `json:"accessToken"`
	}
	require.NoError(t, json.Unmarshal(itLogin.Body.Bytes(), &itSession))
	itDisable, _ := json.Marshal(map[string]string{"password": "correct-password", "code": itCode})
	require.Equal(t, 401, call(http.MethodPost, "/v1/identity/mfa/disable", itSession.AccessToken, itDisable).Code)
}
