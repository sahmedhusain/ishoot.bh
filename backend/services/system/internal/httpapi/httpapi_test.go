package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
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
	"platform.local/backend/pkg/secrets"
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
	moduleReader := authntest.NewServiceSigner(t, "identity")
	moduleKey, ok := moduleReader.Public.Key(0)
	require.True(t, ok)
	require.NoError(t, admin.Public.AddKey(moduleKey))
	ring, err := secrets.NewKeyring(secrets.Config{
		Keys:         []string{"primary:MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE="},
		PrimaryKeyID: "primary",
	})
	require.NoError(t, err)
	httpapi.Register(e, app.New(postgres.New(pool), ring), httpapi.Options{
		Verifier:           authn.NewVerifier(time.Second, services, identity.Trust()),
		ReadCallers:        []string{"admin", "web"},
		ModuleReadCallers:  []string{"identity"},
		ModuleWriters:      []string{"admin"},
		IntegrationWriters: []string{"admin"},
		DomainWriters:      []string{"admin"},
		JSONBodyLimit:      4096,
		SiteCodeBodyLimit:  256 << 10,
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
	moduleToken := moduleReader.Sign(t, authntest.Token{Subject: "identity"})
	require.Equal(t, http.StatusOK, call(moduleToken, http.MethodGet, "/v1/system/modules", nil).Code)
	for _, path := range []string{"/v1/system/integrations", "/v1/system/integrations/resend", "/v1/system/site"} {
		require.Equal(t, http.StatusForbidden, call(moduleToken, http.MethodGet, path, nil).Code)
	}
	require.Equal(t, http.StatusForbidden, call(moduleToken, http.MethodPut, "/v1/system/modules/store", map[string]any{"enabled": true, "actorId": "u"}).Code)
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

	// Integrations: desk reads catalogue with masked secrets; service reads decrypted credentials.
	deskIntegrations := call(it("it_engineer"), http.MethodGet, "/v1/system/desk/integrations", nil)
	require.Equal(t, http.StatusOK, deskIntegrations.Code)
	var deskList struct{ Items []app.DeskIntegration }
	require.NoError(t, json.Unmarshal(deskIntegrations.Body.Bytes(), &deskList))
	assert.Len(t, deskList.Items, len(catalog.Integrations.Providers))

	// Save WhatsApp integration from IT desk
	saveRes := call(it("it_admin"), http.MethodPut, "/v1/system/desk/integrations/whatsapp", map[string]any{
		"isActive": true,
		"values": map[string]string{
			"phoneId": "123456",
			"token":   "secret-token-long-value",
		},
	})
	require.Equal(t, http.StatusOK, saveRes.Code)
	var savedDesk app.DeskIntegration
	require.NoError(t, json.Unmarshal(saveRes.Body.Bytes(), &savedDesk))
	assert.True(t, savedDesk.IsActive)
	assert.Equal(t, "123456", savedDesk.Values["phoneId"])
	assert.True(t, savedDesk.Secrets["token"].Set)
	assert.Equal(t, "…alue", savedDesk.Secrets["token"].Hint)
	assert.Empty(t, savedDesk.Values["token"], "secrets are never in values")

	// Service callers can read the decrypted credentials
	svcRes := call(adminToken, http.MethodGet, "/v1/system/integrations/whatsapp", nil)
	require.Equal(t, http.StatusOK, svcRes.Code)
	var svcItem app.ServiceIntegration
	require.NoError(t, json.Unmarshal(svcRes.Body.Bytes(), &svcItem))
	assert.True(t, svcItem.IsActive)
	assert.Equal(t, "secret-token-long-value", svcItem.Credentials["token"])

	// Service callers can update status
	statusRes := call(adminToken, http.MethodPut, "/v1/system/integrations/whatsapp/status", map[string]any{
		"healthStatus": "healthy",
		"accountName":  "My WhatsApp Business",
	})
	require.Equal(t, http.StatusNoContent, statusRes.Code)

	// List service integrations returns stored items
	listSvc := call(webToken, http.MethodGet, "/v1/system/integrations", nil)
	require.Equal(t, http.StatusOK, listSvc.Code)
	var svcs struct{ Items []app.ServiceIntegration }
	require.NoError(t, json.Unmarshal(listSvc.Body.Bytes(), &svcs))
	assert.NotEmpty(t, svcs.Items)

	// Unlink clears credentials
	unlinkRes := call(it("it_admin"), http.MethodDelete, "/v1/system/desk/integrations/whatsapp", nil)
	require.Equal(t, http.StatusNoContent, unlinkRes.Code)

	// Site: empty before anything is saved; the apps read it with service tokens.
	var site app.Site
	rec := call(webToken, http.MethodGet, "/v1/system/site", nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &site))
	assert.Empty(t, site.WebsiteDomain)
	assert.Empty(t, site.Code.HeadHTML)

	// Domains: the setup wizard (admin) for a person, or IT with domains:edit. They are normalised and must differ.
	assert.Equal(t, http.StatusForbidden, call(webToken, http.MethodPut, "/v1/system/site/domains", map[string]any{"websiteDomain": "example.com", "adminDomain": "", "actorId": "u"}).Code)
	rec = call(adminToken, http.MethodPut, "/v1/system/site/domains", map[string]any{"websiteDomain": "https://Example.com/about", "adminDomain": "", "actorId": "staff-7"})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Contains(t, rec.Body.String(), `"websiteDomain":"example.com"`)
	assert.Equal(t, http.StatusForbidden, call(it("it_support"), http.MethodGet, "/v1/system/desk/site/domains", nil).Code)
	assert.Equal(t, http.StatusForbidden, call(it("it_auditor"), http.MethodPut, "/v1/system/desk/site/domains", map[string]any{"websiteDomain": "", "adminDomain": ""}).Code)
	rec = call(it("it_engineer"), http.MethodPut, "/v1/system/desk/site/domains", map[string]any{"websiteDomain": "example.com", "adminDomain": "example.com"})
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	assert.Contains(t, rec.Body.String(), "domains_must_differ")
	assert.Equal(t, http.StatusUnprocessableEntity, call(it("it_engineer"), http.MethodPut, "/v1/system/desk/site/domains", map[string]any{"websiteDomain": "127.0.0.1", "adminDomain": ""}).Code)
	rec = call(it("it_engineer"), http.MethodPut, "/v1/system/desk/site/domains", map[string]any{"websiteDomain": "example.com", "adminDomain": "admin.example.com"})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	rec = call(it("it_admin"), http.MethodGet, "/v1/system/desk/site/domains", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), `"adminDomain":"admin.example.com"`)
	assert.Contains(t, rec.Body.String(), `"updatedBy":"it:it-1"`)

	// Site code: IT with site_code:edit; ids are checked; the website reads it back.
	code := map[string]any{"googleAnalyticsId": "G-ABC1234", "metaPixelId": "", "tiktokPixelId": "", "headHtml": "<meta name=x>", "bodyHtml": ""}
	assert.Equal(t, http.StatusForbidden, call(it("it_support"), http.MethodPut, "/v1/system/desk/site/code", code).Code)
	assert.Equal(t, http.StatusUnprocessableEntity, call(it("it_admin"), http.MethodPut, "/v1/system/desk/site/code",
		map[string]any{"googleAnalyticsId": "UA-1", "metaPixelId": "", "tiktokPixelId": "", "headHtml": "", "bodyHtml": ""}).Code)
	rec = call(it("it_admin"), http.MethodPut, "/v1/system/desk/site/code", code)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	rec = call(webToken, http.MethodGet, "/v1/system/site", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &site))
	assert.Equal(t, "G-ABC1234", site.Code.GoogleAnalyticsID)
	assert.Equal(t, "<meta name=x>", site.Code.HeadHTML)
	assert.Equal(t, "admin.example.com", site.AdminDomain, "saving code keeps the domains")
	rec = call(it("it_engineer"), http.MethodGet, "/v1/system/desk/site/code", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), `"googleAnalyticsId":"G-ABC1234"`)

	// Every successful change wrote its event in the same transaction; refused ones wrote none. Payloads follow
	// contracts/events and carry no credentials or code.
	rows, err := pool.Query(ctx, `SELECT subject, payload FROM system.outbox ORDER BY created_at, id`)
	require.NoError(t, err)
	counts := map[string]int{}
	for rows.Next() {
		var subject string
		var payload []byte
		require.NoError(t, rows.Scan(&subject, &payload))
		counts[subject]++
		checkEvent(t, subject, payload)
		assert.NotContains(t, string(payload), "secret-token-long-value")
		assert.NotContains(t, string(payload), "<meta")
	}
	require.NoError(t, rows.Err())
	assert.Equal(t, map[string]int{
		app.EventModuleChanged:      2,
		app.EventIntegrationChanged: 1,
		app.EventIntegrationRemoved: 1,
		app.EventDomainsChanged:     2,
		app.EventSiteCodeChanged:    1,
	}, counts)
}

// checkEvent compares a payload with its schema: the required keys are present, no other keys, and the JSON types
// match.
func checkEvent(t *testing.T, subject string, payload []byte) {
	t.Helper()
	raw, err := os.ReadFile("../../../../../contracts/events/" + subject + ".v1.json")
	require.NoError(t, err, "no schema for %s", subject)
	var schema struct {
		Required   []string
		Properties map[string]struct{ Type string }
	}
	require.NoError(t, json.Unmarshal(raw, &schema))
	var body map[string]any
	require.NoError(t, json.Unmarshal(payload, &body))
	for _, key := range schema.Required {
		assert.Contains(t, body, key, subject)
	}
	for key, value := range body {
		prop, ok := schema.Properties[key]
		require.True(t, ok, "%s: %s is not in the schema", subject, key)
		switch value.(type) {
		case string:
			assert.Equal(t, "string", prop.Type, "%s.%s", subject, key)
		case bool:
			assert.Equal(t, "boolean", prop.Type, "%s.%s", subject, key)
		default:
			t.Errorf("%s.%s: unexpected type %T", subject, key, value)
		}
	}
}
