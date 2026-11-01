package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/jackc/pgx/v5/pgxpool"
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
	"platform.local/backend/services/itsm/api"
	"platform.local/backend/services/itsm/internal/app"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/httpapi"
	"platform.local/backend/services/itsm/internal/postgres"
	"platform.local/backend/services/itsm/migrations"
)

type env struct {
	t       *testing.T
	handler http.Handler
	router  routers.Router
	pool    *pgxpool.Pool
	svc     *app.Service
	admin   string // the admin app's service token
	web     string // a known service that may not raise tickets
	it      func(roles ...string) string
}

func setup(t *testing.T) *env {
	t.Helper()
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{
		URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute, MaxConnIdleTime: time.Minute,
		HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second,
	}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "itsm", Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger}))

	svc := app.New(postgres.New(pool), app.Options{Limits: domain.Limits{MaxAttachments: 2}, ITDisplayName: "IT Support", BreachBatch: 1})
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "itsm", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	admin, web, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewServiceSigner(t, "web"), authntest.NewSigner(t, "identity-1")
	// Every caller's public key sits in one service key set, as in AUTH_SERVICE_KEYS_FILE.
	services := admin.Trust()
	webKey, ok := web.Public.Key(0)
	require.True(t, ok)
	require.NoError(t, admin.Public.AddKey(webKey))
	httpapi.Register(e, svc, httpapi.Options{
		Verifier:       authn.NewVerifier(time.Second, services, identity.Trust()),
		RequestCallers: []string{"admin"}, JSONBodyLimit: 8192, DefaultPageSize: 2, MaxPageSize: 10,
	})

	doc, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, doc.Validate(ctx))
	router, err := gorillamux.NewRouter(doc)
	require.NoError(t, err)
	return &env{
		t: t, handler: e, router: router, pool: pool, svc: svc,
		admin: admin.Sign(t, authntest.Token{Subject: "admin"}),
		web:   web.Sign(t, authntest.Token{Subject: "web"}),
		it: func(roles ...string) string {
			return identity.Sign(t, authntest.Token{Subject: "it-user-1", Realm: authn.RealmIT, Roles: roles})
		},
	}
}

// call sends a request and checks the response against the OpenAPI document.
func (e *env) call(token, method, path string, query url.Values, payload any) *httptest.ResponseRecorder {
	e.t.Helper()
	target := path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}
	var body []byte
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		require.NoError(e.t, err)
	}
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	e.handler.ServeHTTP(rec, req)

	route, params, err := e.router.FindRoute(httptest.NewRequest(method, "http://localhost"+target, nil))
	require.NoError(e.t, err, "%s %s is not in the OpenAPI document", method, path)
	input := &openapi3filter.ResponseValidationInput{
		RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route,
			Options: &openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc}},
		Status: rec.Code, Header: rec.Header(),
		Options: &openapi3filter.Options{IncludeResponseStatus: true},
	}
	input.SetBodyBytes(rec.Body.Bytes())
	require.NoError(e.t, openapi3filter.ValidateResponse(context.Background(), input), "response breaks the contract: %s", rec.Body)
	return rec
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &v), rec.Body.String())
	return v
}

type ticket struct {
	ID             string `json:"id"`
	Number         int64  `json:"number"`
	Status         string `json:"status"`
	Priority       string `json:"priority"`
	RequesterEmail string `json:"requesterEmail"`
	AssigneeID     string `json:"assigneeId"`
	AssigneeName   string `json:"assigneeName"`
	Breached       bool   `json:"breached"`
	FirstResponse  string `json:"firstResponseAt"`
}

type detail struct {
	Ticket   ticket `json:"ticket"`
	Comments []struct {
		AuthorName string `json:"authorName"`
		Internal   bool   `json:"internal"`
	} `json:"comments"`
	Events []struct {
		Kind    string `json:"kind"`
		ActorID string `json:"actorId"`
	} `json:"events"`
	Attachments []struct {
		FileURL string `json:"fileUrl"`
	} `json:"attachments"`
}

type page struct {
	Items      []ticket `json:"items"`
	NextCursor string   `json:"nextCursor"`
}

func code(t *testing.T, rec *httptest.ResponseRecorder) string {
	return decode[struct {
		Code string `json:"code"`
	}](t, rec).Code
}

func newTicket(requester string) map[string]any {
	return map[string]any{
		"requesterId": requester, "requesterName": "Employee " + requester, "requesterEmail": requester + "@example.test",
		"category": "hardware", "subcategory": "repair", "title": "Laptop will not start", "description": "Black screen since this morning.",
		"assetRef":    "LAP-0042",
		"attachments": []map[string]any{{"fileUrl": catalog.Files.URLPrefix + "it/photo.png", "fileName": "photo.png", "mimeType": "image/png", "fileSize": 10}},
	}
}

func TestTickets(t *testing.T) {
	e := setup(t)
	const mine = "/v1/itsm/requests/tickets"
	who := url.Values{"requesterId": {"emp-1"}}

	// Raising a ticket: only allowed callers, validated against the catalogue.
	rec := e.call(e.web, http.MethodPost, mine, nil, newTicket("emp-1"))
	assert.Equal(t, http.StatusForbidden, rec.Code, "only the configured callers act for employees")
	assert.Equal(t, http.StatusUnauthorized, e.call(e.it("it_admin"), http.MethodPost, mine, nil, newTicket("emp-1")).Code)
	bad := newTicket("emp-1")
	bad["subcategory"] = "vpn"
	rec = e.call(e.admin, http.MethodPost, mine, nil, bad)
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)

	rec = e.call(e.admin, http.MethodPost, mine, nil, newTicket("emp-1"))
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	created := decode[ticket](t, rec)
	assert.Equal(t, catalog.Tickets.DefaultPriority, created.Priority)
	assert.Equal(t, "new", created.Status)
	assert.Empty(t, created.RequesterEmail, "requesters do not get IT-only fields back")
	for range 2 {
		require.Equal(t, http.StatusCreated, e.call(e.admin, http.MethodPost, mine, nil, newTicket("emp-1")).Code)
	}
	require.Equal(t, http.StatusCreated, e.call(e.admin, http.MethodPost, mine, nil, newTicket("emp-2")).Code)

	// Lists are per requester and paged.
	first := decode[page](t, e.call(e.admin, http.MethodGet, mine, who, nil))
	require.Len(t, first.Items, 2)
	require.NotEmpty(t, first.NextCursor)
	second := decode[page](t, e.call(e.admin, http.MethodGet, mine, url.Values{"requesterId": {"emp-1"}, "cursor": {first.NextCursor}}, nil))
	require.Len(t, second.Items, 1)
	assert.Equal(t, created.ID, second.Items[0].ID, "newest first; the first ticket is last")
	assert.Equal(t, http.StatusUnprocessableEntity, e.call(e.admin, http.MethodGet, mine, url.Values{"requesterId": {"emp-1"}, "cursor": {"garbage"}}, nil).Code)

	// Another employee cannot see the ticket.
	rec = e.call(e.admin, http.MethodGet, mine+"/"+created.ID, url.Values{"requesterId": {"emp-2"}}, nil)
	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.Equal(t, httpapi.CodeNotFound, code(t, rec))

	// The desk: permissions per role.
	desk := "/v1/itsm/desk/tickets"
	assert.Equal(t, http.StatusUnauthorized, e.call(e.admin, http.MethodGet, desk, nil, nil).Code, "service tokens do not reach the desk")
	queue := decode[page](t, e.call(e.it("it_auditor"), http.MethodGet, desk, url.Values{"open": {"true"}, "limit": {"10"}}, nil))
	assert.Len(t, queue.Items, 4)
	assert.Equal(t, "emp-1@example.test", queue.Items[3].RequesterEmail)
	assert.Equal(t, http.StatusForbidden, e.call(e.it("it_auditor"), http.MethodPost, desk+"/"+created.ID+"/transitions", nil, map[string]any{"transition": "triage"}).Code)
	assert.Equal(t, http.StatusForbidden, e.call(e.it(), http.MethodGet, desk, nil, nil).Code)

	// Workflow: IT assigns, asks for information, the requester answers, IT resolves, the requester closes.
	it := e.it("it_support")
	rec = e.call(it, http.MethodPost, desk+"/"+created.ID+"/transitions", nil, map[string]any{"transition": "assign"})
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code, "assigning needs an assignee")
	rec = e.call(it, http.MethodPost, desk+"/"+created.ID+"/transitions", nil, map[string]any{"transition": "assign", "assigneeId": "it-user-1", "assigneeName": "Sam"})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assigned := decode[ticket](t, rec)
	assert.Equal(t, "assigned", assigned.Status)
	assert.NotEmpty(t, assigned.FirstResponse, "the first IT action counts as the response")

	rec = e.call(it, http.MethodPost, desk+"/"+created.ID+"/transitions", nil, map[string]any{"transition": "close"})
	assert.Equal(t, http.StatusConflict, rec.Code)
	assert.Equal(t, httpapi.CodeTransition, code(t, rec))

	require.Equal(t, http.StatusCreated, e.call(it, http.MethodPost, desk+"/"+created.ID+"/comments", nil, map[string]any{"body": "Checked warranty", "internal": true}).Code)
	require.Equal(t, http.StatusOK, e.call(it, http.MethodPost, desk+"/"+created.ID+"/transitions", nil, map[string]any{"transition": "request_info"}).Code)

	answer := map[string]any{"requesterId": "emp-1", "requesterName": "Employee emp-1", "transition": "resolve"}
	assert.Equal(t, http.StatusForbidden, e.call(e.admin, http.MethodPost, mine+"/"+created.ID+"/transitions", nil, answer).Code, "requesters cannot resolve")
	answer["transition"] = "provide_info"
	answer["requesterId"] = "emp-2"
	assert.Equal(t, http.StatusNotFound, e.call(e.admin, http.MethodPost, mine+"/"+created.ID+"/transitions", nil, answer).Code)
	answer["requesterId"] = "emp-1"
	require.Equal(t, http.StatusOK, e.call(e.admin, http.MethodPost, mine+"/"+created.ID+"/transitions", nil, answer).Code)
	require.Equal(t, http.StatusCreated, e.call(e.admin, http.MethodPost, mine+"/"+created.ID+"/comments", nil,
		map[string]any{"requesterId": "emp-1", "requesterName": "Employee emp-1", "body": "Serial is on the back"}).Code)

	require.Equal(t, http.StatusOK, e.call(it, http.MethodPost, desk+"/"+created.ID+"/transitions", nil, map[string]any{"transition": "resolve"}).Code)
	answer["transition"] = "close"
	require.Equal(t, http.StatusOK, e.call(e.admin, http.MethodPost, mine+"/"+created.ID+"/transitions", nil, answer).Code)
	assert.Equal(t, http.StatusConflict, e.call(e.admin, http.MethodPost, mine+"/"+created.ID+"/comments", nil,
		map[string]any{"requesterId": "emp-1", "requesterName": "Employee emp-1", "body": "One more thing"}).Code, "closed tickets take no comments")

	// The requester's view hides internal notes and IT identities; IT sees everything.
	view := decode[detail](t, e.call(e.admin, http.MethodGet, mine+"/"+created.ID, who, nil))
	assert.Equal(t, "closed", view.Ticket.Status)
	require.Len(t, view.Comments, 1)
	assert.Equal(t, "Employee emp-1", view.Comments[0].AuthorName)
	require.Len(t, view.Attachments, 1)
	for _, ev := range view.Events {
		assert.Empty(t, ev.ActorID)
	}
	full := decode[detail](t, e.call(it, http.MethodGet, desk+"/"+created.ID, nil, nil))
	require.Len(t, full.Comments, 2)
	assert.True(t, full.Comments[0].Internal)
	assert.Equal(t, "IT Support", full.Comments[0].AuthorName)
	assert.Equal(t, "it-user-1", full.Events[1].ActorID)
}

func TestSLA(t *testing.T) {
	e := setup(t)
	admin, support := e.it("it_admin"), e.it("it_support")
	rec := e.call(support, http.MethodGet, "/v1/itsm/desk/sla", nil, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Len(t, decode[struct {
		Items []any `json:"items"`
	}](t, rec).Items, len(catalog.Tickets.Priorities))

	change := map[string]any{"responseMinutes": 5, "resolveMinutes": 1}
	assert.Equal(t, http.StatusForbidden, e.call(support, http.MethodPut, "/v1/itsm/desk/sla/normal", nil, change).Code)
	assert.Equal(t, http.StatusUnprocessableEntity, e.call(admin, http.MethodPut, "/v1/itsm/desk/sla/normal", nil, change).Code, "resolve before respond")
	assert.Equal(t, http.StatusUnprocessableEntity, e.call(admin, http.MethodPut, "/v1/itsm/desk/sla/urgent", nil, map[string]any{"responseMinutes": 1, "resolveMinutes": 5}).Code)
	require.Equal(t, http.StatusNoContent, e.call(admin, http.MethodPut, "/v1/itsm/desk/sla/normal", nil, map[string]any{"responseMinutes": 1, "resolveMinutes": 1}).Code)

	// Tickets past their deadline are flagged by the sweep, in batches, and only once.
	for range 3 {
		require.Equal(t, http.StatusCreated, e.call(e.admin, http.MethodPost, "/v1/itsm/requests/tickets", nil, newTicket("emp-1")).Code)
	}
	ctx := context.Background()
	_, err := e.pool.Exec(ctx, "UPDATE itsm.ticket SET resolve_by = now() - interval '1 minute'")
	require.NoError(t, err)
	n, err := e.svc.MarkBreached(ctx)
	require.NoError(t, err)
	assert.Equal(t, 3, n)
	n, err = e.svc.MarkBreached(ctx)
	require.NoError(t, err)
	assert.Zero(t, n)
	queue := decode[page](t, e.call(support, http.MethodGet, "/v1/itsm/desk/tickets", url.Values{"limit": {"10"}}, nil))
	for _, item := range queue.Items {
		assert.True(t, item.Breached)
	}
}
