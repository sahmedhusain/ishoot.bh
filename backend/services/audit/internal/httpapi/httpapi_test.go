package httpapi_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/google/uuid"
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
	"platform.local/backend/services/audit/api"
	"platform.local/backend/services/audit/internal/app"
	"platform.local/backend/services/audit/internal/httpapi"
	"platform.local/backend/services/audit/internal/postgres"
	"platform.local/backend/services/audit/migrations"
)

func TestDesk(t *testing.T) {
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute,
		MaxConnIdleTime: time.Minute, HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: logger.Logger}))
	svc := app.New(postgres.New(pool))

	start := time.Date(2026, 11, 2, 8, 0, 0, 0, time.UTC)
	for i := range 7 {
		subject, actor := "system.module.changed", "it:alice"
		if i%2 == 1 {
			subject, actor = "system.site_code.changed", "admin:staff-7"
		}
		_, err := svc.Record(ctx, app.Incoming{ID: uuid.NewString(), Subject: subject, OccurredAt: start.Add(time.Duration(i) * time.Minute),
			Data: fmt.Appendf(nil, `{"changedBy":%q,"n":%d}`, actor, i)})
		require.NoError(t, err)
	}

	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "audit", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	admin, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewSigner(t, "identity-1")
	httpapi.Register(e, svc, httpapi.Options{
		Verifier: authn.NewVerifier(time.Second, admin.Trust(), identity.Trust()), DefaultPageSize: 3, MaxPageSize: 5,
	})
	doc, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, doc.Validate(ctx))
	router, err := gorillamux.NewRouter(doc)
	require.NoError(t, err)
	call := func(token, path string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		route, params, err := router.FindRoute(httptest.NewRequest(http.MethodGet, "http://localhost"+path, nil))
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
	it := func(roles ...string) string {
		return identity.Sign(t, authntest.Token{Subject: "it-1", Realm: authn.RealmIT, Roles: roles})
	}
	type page struct {
		Items      []app.Event
		NextCursor string
	}
	read := func(rec *httptest.ResponseRecorder) page {
		t.Helper()
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var p page
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &p))
		return p
	}

	// Only IT accounts with audit:read: an auditor yes, IT support no, and never a service token.
	assert.Equal(t, http.StatusForbidden, call(it("it_support"), "/v1/audit/desk/events").Code)
	assert.Equal(t, http.StatusUnauthorized, call(admin.Sign(t, authntest.Token{Subject: "admin"}), "/v1/audit/desk/events").Code)

	// Pages, newest first, follow the cursor to the end.
	var seen []string
	path := "/v1/audit/desk/events"
	for {
		p := read(call(it("it_auditor"), path))
		for _, ev := range p.Items {
			seen = append(seen, ev.OccurredAt.Format("15:04"))
		}
		if p.NextCursor == "" {
			break
		}
		path = "/v1/audit/desk/events?cursor=" + p.NextCursor
	}
	assert.Equal(t, []string{"08:06", "08:05", "08:04", "08:03", "08:02", "08:01", "08:00"}, seen)

	// Filters combine.
	p := read(call(it("it_admin"), "/v1/audit/desk/events?limit=5&actor="+url.QueryEscape("admin:staff-7")+"&from="+url.QueryEscape("2026-11-02T08:02:00Z")))
	require.Len(t, p.Items, 2)
	assert.Equal(t, "system.site_code.changed", p.Items[0].Subject)
	p = read(call(it("it_admin"), "/v1/audit/desk/events?subject=system.module.changed&limit=5"))
	assert.Len(t, p.Items, 4)

	// One event, the subjects, and refusals.
	one := p.Items[0]
	rec := call(it("it_engineer"), "/v1/audit/desk/events/"+one.ID)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), `"actor":"it:alice"`)
	assert.Equal(t, http.StatusNotFound, call(it("it_admin"), "/v1/audit/desk/events/"+uuid.NewString()).Code)
	rec = call(it("it_admin"), "/v1/audit/desk/subjects")
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), `"subject":"system.module.changed","events":4`)
	for _, bad := range []string{"limit=6", "limit=0", "cursor=bogus", "from=yesterday"} {
		assert.Equal(t, http.StatusUnprocessableEntity, call(it("it_admin"), "/v1/audit/desk/events?"+bad).Code, bad)
	}
}
