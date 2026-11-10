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
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/live"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/notify/api"
	"platform.local/backend/services/notify/internal/app"
	"platform.local/backend/services/notify/internal/httpapi"
	"platform.local/backend/services/notify/internal/jobs"
	"platform.local/backend/services/notify/internal/postgres"
	"platform.local/backend/services/notify/migrations"
)
func TestInbox(t *testing.T) {
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute,
		MaxConnIdleTime:	time.Minute, HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger}))
	svc := app.New(postgres.New(pool), nil, app.Options{MaxAttempts: 3, MaxAttachmentBytes: 1 << 20})
	inserter, err := jobs.NewClient(pool, nil, jobs.Options{Schema: postgres.Schema, Workers: 1, MaxAttempts: 3, Logger: logger.Logger})
	require.NoError(t, err)
	svc.SetJobs(inserter)
	hints := &live.Recorder{}
	svc.SetLive(hints)
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "notify", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	admin, web, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewServiceSigner(t, "web"), authntest.NewSigner(t, "identity-1")
	webKey, ok := web.Public.Key(0)
	require.True(t, ok)
	require.NoError(t, admin.Public.AddKey(webKey))
	httpapi.Register(e, svc, httpapi.Options{Verifier: authn.NewVerifier(time.Second, admin.Trust(), identity.Trust()),
		SendCallers:	[]string{"admin"}, InboxCallers: []string{"admin"}, BodyLimit: 1 << 20, InboxBodyLimit: 1 << 20,
		DefaultPageSize:	2, MaxPageSize: 50})
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
				Options:	&openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc}},
			Status:	rec.Code, Header: rec.Header(), Options: &openapi3filter.Options{IncludeResponseStatus: true},
		}
		input.SetBodyBytes(rec.Body.Bytes())
		require.NoError(t, openapi3filter.ValidateResponse(ctx, input), "response breaks the contract: %s", rec.Body)
		return rec
	}
	adminToken := admin.Sign(t, authntest.Token{Subject: "admin"})
	decode := func(rec *httptest.ResponseRecorder, into any) {
		t.Helper()
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), into), rec.Body.String())
	}
	const alice, bob = "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"
	owner := func(user, categories string) string {
		q := url.Values{"realm": {"staff"}, "userId": {user}}
		if categories != "" {
			q.Set("categories", categories)
		}
		return q.Encode()
	}
	type page struct {
		Items		[]app.InboxItem	`json:"items"`
		Unread		int64		`json:"unread"`
		NextCursor	string		`json:"nextCursor"`
	}
	task := map[string]any{"realm": "staff", "recipient": alice, "title": "Task assigned", "body": "Prepare the report",
		"messageKey":	"tasks.notifications.assigned", "messageParams": map[string]string{"title": "Report"},
		"entityType":	"task", "entityId": "t-1", "actionUrl": "/dashboard/tasks/t-1", "dedupeKey": "task:t-1:assigned"}
	assert.Equal(t, http.StatusForbidden, call(web.Sign(t, authntest.Token{Subject: "web"}), http.MethodPost, "/v1/notify/inbox",
		map[string]any{"items": []any{task}}).Code)
	rec := call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{task,
		map[string]any{"realm": "staff", "recipient": bob, "title": "Low stock", "entityType": "product", "entityId": "p-1"},
		map[string]any{"realm": "staff", "recipient": alice, "title": "Invoice overdue", "category": "finance", "priority": "urgent"},
	}})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var delivered app.DeliverResult
	decode(rec, &delivered)
	assert.Equal(t, 3, delivered.Created)
	require.Len(t, hints.Sent, 3, "fresh notifications ring live")
	assert.Equal(t, app.HintCreated, hints.Sent[0].Event.Type)
	assert.Equal(t, alice, hints.Sent[0].Target.ID)
	assert.NotContains(t, string(hints.Sent[0].Event.Data), "Prepare", "hints never carry the message")
	rec = call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{task}})
	decode(rec, &delivered)
	assert.Equal(t, 0, delivered.Created)
	assert.Equal(t, 1, delivered.Duplicates)
	for name, bad := range map[string]map[string]any{
		"external link":	{"realm": "staff", "recipient": alice, "title": "x", "actionUrl": "https://evil.example"},
		"protocol-relative":	{"realm": "staff", "recipient": alice, "title": "x", "actionUrl": "//evil.example"},
		"wrong realm":		{"realm": "customer", "recipient": alice, "title": "x"},
		"staff category":	{"realm": "it", "recipient": "it-1", "title": "x", "category": "approvals"},
		"empty title":		{"realm": "staff", "recipient": alice, "title": " "},
	} {
		assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPost, "/v1/notify/inbox",
			map[string]any{"items": []any{bad}}).Code, name)
	}
	rec = call(adminToken, http.MethodGet, "/v1/notify/inbox?"+owner(alice, "tasks,approvals,system,security"), nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var p page
	decode(rec, &p)
	require.Len(t, p.Items, 1)
	assert.Equal(t, "tasks", p.Items[0].Category)
	assert.Equal(t, "Report", p.Items[0].MessageParams["title"])
	assert.EqualValues(t, 1, p.Unread)
	rec = call(adminToken, http.MethodGet, "/v1/notify/inbox?"+owner(alice, ""), nil)
	decode(rec, &p)
	require.Len(t, p.Items, 2)
	assert.ElementsMatch(t, []string{"urgent", "normal"}, []string{p.Items[0].Priority, p.Items[1].Priority})
	assert.Equal(t, http.StatusNotFound, call(adminToken, http.MethodGet, "/v1/notify/inbox/"+p.Items[0].ID+"?"+owner(bob, ""), nil).Code,
		"another person's notification is not found")
	assert.Equal(t, http.StatusOK, call(adminToken, http.MethodGet, "/v1/notify/inbox/"+p.Items[0].ID+"?"+owner(alice, ""), nil).Code)
	for i := range 3 {
		call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{map[string]any{
			"realm":	"staff", "recipient": alice, "title": "Announcement", "category": "announcements", "dedupeKey": "a" + string(rune('0'+i))}}})
	}
	seen := map[string]bool{}
	cursor := ""
	for range 5 {
		path := "/v1/notify/inbox?" + owner(alice, "") + "&limit=2"
		if cursor != "" {
			path += "&cursor=" + cursor
		}
		p = page{}
		decode(call(adminToken, http.MethodGet, path, nil), &p)
		for _, it := range p.Items {
			assert.False(t, seen[it.ID], "no item twice")
			seen[it.ID] = true
		}
		if cursor = p.NextCursor; cursor == "" {
			break
		}
	}
	assert.Len(t, seen, 5)
	hints.Sent = nil
	rec = call(adminToken, http.MethodPost, "/v1/notify/inbox/actions?"+owner(alice, ""), map[string]any{"action": "read", "ids": []string{p.Items[0].ID}})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var result struct{ Changed, Unread int64 }
	decode(rec, &result)
	assert.EqualValues(t, 1, result.Changed)
	assert.EqualValues(t, 4, result.Unread)
	require.Len(t, hints.Sent, 1)
	assert.Equal(t, app.HintChanged, hints.Sent[0].Event.Type)
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox/actions?"+owner(alice, ""), map[string]any{"action": "read", "all": true}), &result)
	assert.EqualValues(t, 0, result.Unread)
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPost, "/v1/notify/inbox/actions?"+owner(alice, ""),
		map[string]any{"action": "read"}).Code, "name the notifications or ask for all")
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox/actions?"+owner(alice, ""),
		map[string]any{"action": "archive", "all": true, "filter": "read", "category": "announcements"}), &result)
	assert.EqualValues(t, 3, result.Changed)
	decode(call(adminToken, http.MethodGet, "/v1/notify/inbox?"+owner(alice, "")+"&filter=archived&limit=50", nil), &p)
	assert.Len(t, p.Items, 3)
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox/actions?"+owner(alice, ""),
		map[string]any{"action": "delete", "all": true, "filter": "archived"}), &result)
	assert.EqualValues(t, 3, result.Changed)
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox/actions?"+owner(bob, ""), map[string]any{"action": "delete", "ids": []string{p.Items[0].ID}}), &result)
	assert.EqualValues(t, 0, result.Changed, "Bob cannot delete Alice's notification")
	rec = call(adminToken, http.MethodGet, "/v1/notify/preferences?"+owner(bob, "inventory,security,system"), nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var prefs app.Preferences
	decode(rec, &prefs)
	assert.True(t, prefs.SoundEnabled)
	assert.Equal(t, "chime", prefs.Sound)
	require.Len(t, prefs.Categories, 3)
	assert.True(t, prefs.Categories[1].Mandatory)
	until := time.Now().Add(time.Hour).UTC().Truncate(time.Second)
	save := map[string]any{"mutedUntil": until, "soundEnabled": false, "sound": "bell", "volume": 40, "popupsEnabled": true,
		"desktopEnabled":	true, "categories": []map[string]any{{"category": "inventory", "muted": true, "sound": true}}}
	rec = call(adminToken, http.MethodPut, "/v1/notify/preferences?"+owner(bob, "inventory,security,system"), save)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	decode(rec, &prefs)
	assert.Equal(t, "bell", prefs.Sound)
	require.NotNil(t, prefs.MutedUntil)
	assert.True(t, prefs.MutedUntil.Equal(until))
	assert.True(t, prefs.Categories[0].Muted)
	save["categories"] = []map[string]any{{"category": "security", "muted": true, "sound": true}}
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPut, "/v1/notify/preferences?"+owner(bob, "inventory,security,system"), save).Code)
	save["categories"] = []map[string]any{{"category": "finance", "muted": true, "sound": true}}
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPut, "/v1/notify/preferences?"+owner(bob, "inventory,security,system"), save).Code,
		"only the person's own categories")
	hints.Sent = nil
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{
		map[string]any{"realm": "staff", "recipient": bob, "title": "Count due", "category": "inventory"},
		map[string]any{"realm": "staff", "recipient": bob, "title": "New sign-in", "category": "security"},
	}}), &delivered)
	require.Len(t, hints.Sent, 2)
	assert.Contains(t, string(hints.Sent[0].Event.Data), `"silent":true`)
	assert.Contains(t, string(hints.Sent[1].Event.Data), `"silent":false`, "security is never silent")
	var summary app.Summary
	decode(call(adminToken, http.MethodGet, "/v1/notify/inbox/summary?"+owner(bob, ""), nil), &summary)
	assert.EqualValues(t, 2, summary.Unread, "the earlier low-stock alert and the sign-in; the muted one is not counted")
	decode(call(adminToken, http.MethodGet, "/v1/notify/inbox?"+owner(bob, "")+"&filter=muted", nil), &p)
	require.Len(t, p.Items, 1)
	assert.Equal(t, "Count due", p.Items[0].Title)
	rec = call(adminToken, http.MethodPut, "/v1/notify/mutes?"+owner(alice, ""), map[string]any{"entityType": "task", "entityId": "t-9"})
	require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{map[string]any{
		"realm":	"staff", "recipient": alice, "title": "Task done", "entityType": "task", "entityId": "t-9"}}}), &delivered)
	decode(call(adminToken, http.MethodGet, "/v1/notify/inbox?"+owner(alice, "")+"&filter=muted", nil), &p)
	require.Len(t, p.Items, 1)
	var mutes struct{ Items []app.Mute }
	decode(call(adminToken, http.MethodGet, "/v1/notify/mutes?"+owner(alice, ""), nil), &mutes)
	require.Len(t, mutes.Items, 1)
	assert.Equal(t, http.StatusNoContent, call(adminToken, http.MethodDelete, "/v1/notify/mutes?"+owner(alice, "")+"&entityType=task&entityId=t-9", nil).Code)
	assert.Equal(t, http.StatusNotFound, call(adminToken, http.MethodDelete, "/v1/notify/mutes?"+owner(alice, "")+"&entityType=task&entityId=t-9", nil).Code)
	hints.Sent = nil
	later := time.Now().Add(time.Hour)
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{map[string]any{
		"realm":	"staff", "recipient": alice, "title": "Reminder", "deliverAt": later}}}), &delivered)
	assert.Equal(t, 1, delivered.Created)
	assert.Empty(t, hints.Sent)
	decode(call(adminToken, http.MethodGet, "/v1/notify/inbox?"+owner(alice, "")+"&limit=50", nil), &p)
	for _, it := range p.Items {
		assert.NotEqual(t, "Reminder", it.Title)
	}
	require.NoError(t, svc.AnnounceDue(ctx, delivered.IDs[0]))
	assert.Len(t, hints.Sent, 1, "the worker announces it when due")
	old := uuid.NewString()
	hints.Sent = nil
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{map[string]any{
		"id":	old, "realm": "staff", "recipient": alice, "title": "Old", "createdAt": time.Now().Add(-48 * time.Hour),
		"readAt":	time.Now().Add(-47 * time.Hour)}}}), &delivered)
	assert.Equal(t, []string{old}, delivered.IDs)
	assert.Empty(t, hints.Sent)
	rec = call(adminToken, http.MethodGet, "/v1/notify/inbox/"+old+"?"+owner(alice, ""), nil)
	var item app.InboxItem
	decode(rec, &item)
	assert.True(t, item.Read)
	itToken := func(roles ...string) string {
		return identity.Sign(t, authntest.Token{Subject: "it-7", Realm: authn.RealmIT, Roles: roles})
	}
	decode(call(adminToken, http.MethodPost, "/v1/notify/inbox", map[string]any{"items": []any{
		map[string]any{"realm": "it", "recipient": "it-7", "title": "Ticket assigned", "entityType": "ticket", "entityId": "k-1"},
		map[string]any{"realm": "it", "recipient": "it-7", "title": "Delivery failing", "category": "it_platform"},
	}}), &delivered)
	assert.Equal(t, 2, delivered.Created)
	decode(call(itToken("it_support"), http.MethodGet, "/v1/notify/me/inbox", nil), &p)
	require.Len(t, p.Items, 2, "support may see tickets and platform health")
	p = page{}
	decode(call(itToken("it_guest"), http.MethodGet, "/v1/notify/me/inbox", nil), &p)
	assert.Empty(t, p.Items, "a role without desk or health permissions sees neither category")
	assert.Equal(t, http.StatusUnauthorized, call(adminToken, http.MethodGet, "/v1/notify/me/inbox", nil).Code)
	decode(call(itToken("it_support"), http.MethodGet, "/v1/notify/me/preferences", nil), &prefs)
	for _, c := range prefs.Categories {
		assert.NotEqual(t, "approvals", c.Category)
	}
}
