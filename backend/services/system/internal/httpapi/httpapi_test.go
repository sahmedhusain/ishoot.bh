package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/system/api"
	"platform.local/backend/services/system/internal/app"
	"platform.local/backend/services/system/internal/httpapi"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/migrations"
)

type module struct {
	Key       string `json:"key"`
	Enabled   bool   `json:"enabled"`
	UpdatedBy string `json:"updatedBy"`
}

func TestModules(t *testing.T) {
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute,
		MaxConnIdleTime: time.Minute, HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "system", Migrations: migrations.FS, Logger: logger.Logger}))

	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "system", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	admin, web, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewServiceSigner(t, "web"), authntest.NewSigner(t, "identity-1")
	services := admin.Trust()
	webKey, ok := web.Public.Key(0)
	require.True(t, ok)
	require.NoError(t, admin.Public.AddKey(webKey))
	httpapi.Register(e, app.New(postgres.New(pool)), httpapi.Options{
		Verifier:    authn.NewVerifier(time.Second, services, identity.Trust()),
		ReadCallers: []string{"admin", "web"}, ModuleWriters: []string{"admin"}, JSONBodyLimit: 4096,
	})
	doc, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, doc.Validate(ctx))
	router, err := gorillamux.NewRouter(doc)
	require.NoError(t, err)

	call := func(token, method, path string, payload any) *httptest.ResponseRecorder {
		t.Helper()
		var body []byte
		if payload != nil {
			body, _ = json.Marshal(payload)
		}
		req := httptest.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		route, params, err := router.FindRoute(httptest.NewRequest(method, "http://localhost"+path, nil))
		require.NoError(t, err)
		input := &openapi3filter.ResponseValidationInput{
			RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route,
				Options: &openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc}},
			Status: rec.Code, Header: rec.Header(), Options: &openapi3filter.Options{IncludeResponseStatus: true},
		}
		input.SetBodyBytes(rec.Body.Bytes())
		require.NoError(t, openapi3filter.ValidateResponse(ctx, input), "response breaks the contract: %s", rec.Body)
		return rec
	}
	list := func(token, path string) map[string]module {
		rec := call(token, http.MethodGet, path, nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var out struct{ Items []module }
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
		byKey := map[string]module{}
		for _, m := range out.Items {
			byKey[m.Key] = m
		}
		return byKey
	}
	adminToken := admin.Sign(t, authntest.Token{Subject: "admin"})
	webToken := web.Sign(t, authntest.Token{Subject: "web"})
	it := func(roles ...string) string {
		return identity.Sign(t, authntest.Token{Subject: "it-1", Realm: authn.RealmIT, Roles: roles})
	}

	// Every catalogue module is listed; nobody switched anything, so defaults apply.
	before := list(webToken, "/v1/system/modules")
	require.Len(t, before, len(catalog.Modules))
	for _, m := range catalog.Modules {
		assert.Equal(t, m.EnabledByDefault, before[m.Key].Enabled, m.Key)
	}
	key := catalog.Modules[0].Key
	want := !catalog.Modules[0].EnabledByDefault

	// Only the configured writers and IT roles with modules:edit may switch.
	assert.Equal(t, http.StatusForbidden, call(webToken, http.MethodPut, "/v1/system/modules/"+key, map[string]any{"enabled": want, "actorId": "u"}).Code)
	assert.Equal(t, http.StatusForbidden, call(it("it_support"), http.MethodPut, "/v1/system/desk/modules/"+key, map[string]any{"enabled": want}).Code)
	assert.Equal(t, http.StatusNotFound, call(adminToken, http.MethodPut, "/v1/system/modules/no_such_module", map[string]any{"enabled": true, "actorId": "u"}).Code)
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPut, "/v1/system/modules/"+key, map[string]any{"actorId": "u"}).Code)

	require.Equal(t, http.StatusNoContent, call(adminToken, http.MethodPut, "/v1/system/modules/"+key, map[string]any{"enabled": want, "actorId": "staff-7"}).Code)
	after := list(adminToken, "/v1/system/modules")
	assert.Equal(t, want, after[key].Enabled)
	assert.Equal(t, "admin:staff-7", after[key].UpdatedBy)

	require.Equal(t, http.StatusNoContent, call(it("it_admin"), http.MethodPut, "/v1/system/desk/modules/"+key, map[string]any{"enabled": !want}).Code)
	desk := list(it("it_engineer"), "/v1/system/desk/modules")
	assert.Equal(t, !want, desk[key].Enabled)
	assert.Equal(t, "it:it-1", desk[key].UpdatedBy)
	assert.Equal(t, http.StatusUnauthorized, call(adminToken, http.MethodGet, "/v1/system/desk/modules", nil).Code)
}
