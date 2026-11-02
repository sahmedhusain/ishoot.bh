package httpapi_test

import (
	"bytes"
	"context"
	"encoding/base64"
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
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/notify/api"
	"platform.local/backend/services/notify/internal/app"
	"platform.local/backend/services/notify/internal/httpapi"
	"platform.local/backend/services/notify/internal/jobs"
	"platform.local/backend/services/notify/internal/postgres"
	"platform.local/backend/services/notify/internal/providers"
	"platform.local/backend/services/notify/migrations"
)

type refuse struct{}

func (refuse) Send(context.Context, providers.Message) (providers.Result, error) {
	return providers.Result{Provider: "fake"}, providers.Permanent("refused")
}

func TestAPI(t *testing.T) {
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute,
		MaxConnIdleTime: time.Minute, HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger}))
	svc := app.New(postgres.New(pool), nil, app.Options{Senders: map[string]providers.Sender{app.Email: refuse{}, app.WhatsApp: refuse{}},
		MaxAttempts: 3, MaxAttachmentBytes: 1 << 20})
	inserter, err := jobs.NewClient(pool, nil, jobs.Options{Schema: postgres.Schema, Workers: 1, MaxAttempts: 3, Logger: logger.Logger})
	require.NoError(t, err)
	svc.SetJobs(inserter)

	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "notify", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	admin, web, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewServiceSigner(t, "web"), authntest.NewSigner(t, "identity-1")
	services := admin.Trust()
	webKey, ok := web.Public.Key(0)
	require.True(t, ok)
	require.NoError(t, admin.Public.AddKey(webKey))
	httpapi.Register(e, svc, httpapi.Options{Verifier: authn.NewVerifier(time.Second, services, identity.Trust()),
		SendCallers: []string{"admin"}, BodyLimit: 1 << 20, DefaultPageSize: 2, MaxPageSize: 5})
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
	adminToken := admin.Sign(t, authntest.Token{Subject: "admin"})
	it := func(roles ...string) string {
		return identity.Sign(t, authntest.Token{Subject: "it-1", Realm: authn.RealmIT, Roles: roles})
	}
	var msg app.Message
	decode := func(rec *httptest.ResponseRecorder) {
		t.Helper()
		msg = app.Message{}
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &msg))
	}

	email := map[string]any{"channel": "email", "to": "client@example.com", "subject": "Invoice", "html": "<p>Hi</p>",
		"idempotencyKey": "invoice-42", "actorId": "staff-7",
		"attachments": []map[string]string{{"filename": "inv.pdf", "contentType": "application/pdf", "content": base64.StdEncoding.EncodeToString([]byte("pdf"))}}}
	assert.Equal(t, http.StatusForbidden, call(web.Sign(t, authntest.Token{Subject: "web"}), http.MethodPost, "/v1/notify/messages", email).Code)
	rec := call(adminToken, http.MethodPost, "/v1/notify/messages", email)
	require.Equal(t, http.StatusAccepted, rec.Code, rec.Body.String())
	decode(rec)
	id := msg.ID
	rec = call(adminToken, http.MethodPost, "/v1/notify/messages", email)
	require.Equal(t, http.StatusOK, rec.Code, "the same key answers with the first message")
	decode(rec)
	assert.Equal(t, id, msg.ID)
	email["attachments"] = []map[string]string{{"filename": "x", "content": "%%%"}}
	email["idempotencyKey"] = "other"
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPost, "/v1/notify/messages", email).Code)
	rec = call(adminToken, http.MethodPost, "/v1/notify/messages", map[string]any{"channel": "whatsapp", "to": "12", "text": "x", "idempotencyKey": "k"})
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	assert.Contains(t, rec.Body.String(), "country code")
	rec = call(adminToken, http.MethodGet, "/v1/notify/messages/"+id, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	decode(rec)
	assert.Nil(t, msg.HTML, "callers get the status, not the body back")

	// IT: the desk needs notifications:*; auditors have none (messages hold personal data).
	assert.Equal(t, http.StatusForbidden, call(it("it_auditor"), http.MethodGet, "/v1/notify/desk/messages", nil).Code)
	assert.Equal(t, http.StatusUnauthorized, call(adminToken, http.MethodGet, "/v1/notify/desk/messages", nil).Code)
	rec = call(it("it_support"), http.MethodGet, "/v1/notify/desk/messages/"+id, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	decode(rec)
	require.Len(t, msg.Attachments, 1)
	assert.Equal(t, "inv.pdf", msg.Attachments[0].Filename)
	assert.Equal(t, "<p>Hi</p>", *msg.HTML)
	assert.Equal(t, http.StatusForbidden, call(it("it_support"), http.MethodPost, "/v1/notify/desk/test", map[string]string{"channel": "email", "to": "it@example.com"}).Code)
	rec = call(it("it_engineer"), http.MethodPost, "/v1/notify/desk/test", map[string]string{"channel": "whatsapp", "to": "+973 3300 0001"})
	require.Equal(t, http.StatusAccepted, rec.Code, rec.Body.String())
	decode(rec)
	assert.Equal(t, "it", msg.Caller)
	assert.Equal(t, "it-1", *msg.Actor)

	// Retry: only a failed message.
	assert.Equal(t, http.StatusConflict, call(it("it_admin"), http.MethodPost, "/v1/notify/desk/messages/"+id+"/retry", nil).Code)
	require.NoError(t, svc.Deliver(ctx, id, 1))
	rec = call(it("it_admin"), http.MethodPost, "/v1/notify/desk/messages/"+id+"/retry", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	decode(rec)
	assert.Equal(t, "queued", msg.Status)
	assert.Equal(t, http.StatusNotFound, call(it("it_admin"), http.MethodPost, "/v1/notify/desk/messages/nope/retry", nil).Code)

	// Listing pages and filters; the summary counts.
	var page struct {
		Items      []app.Message
		NextCursor string
	}
	rec = call(it("it_admin"), http.MethodGet, "/v1/notify/desk/messages", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &page))
	assert.Len(t, page.Items, 2)
	require.NotEmpty(t, page.NextCursor)
	rec = call(it("it_admin"), http.MethodGet, "/v1/notify/desk/messages?channel=whatsapp&limit=5", nil)
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &page))
	assert.Len(t, page.Items, 1)
	assert.Equal(t, http.StatusUnprocessableEntity, call(it("it_admin"), http.MethodGet, "/v1/notify/desk/messages?status=lost", nil).Code)
	rec = call(it("it_support"), http.MethodGet, "/v1/notify/desk/summary", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), `"channel":"whatsapp"`)
}
