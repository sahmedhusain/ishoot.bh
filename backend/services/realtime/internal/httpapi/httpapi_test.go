package httpapi_test
import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/prometheus/client_golang/prometheus"
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
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/realtime/api"
	"platform.local/backend/services/realtime/internal/app"
	"platform.local/backend/services/realtime/internal/httpapi"
	"platform.local/backend/services/realtime/internal/hub"
	"platform.local/backend/services/realtime/internal/postgres"
	"platform.local/backend/services/realtime/internal/presence"
	"platform.local/backend/services/realtime/internal/subscriber"
	"platform.local/backend/services/realtime/migrations"
)
func TestRealtime(t *testing.T) {
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{URL: testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute,
		MaxConnIdleTime:	time.Minute, HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: logger.Logger}))
	tracker := presence.NewMemory()
	hints := &live.Recorder{}
	svc := app.New(postgres.New(pool), tracker, hints)
	streams := hub.New(5)
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "realtime", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	e.Use(telemetry.EchoMiddleware())
	admin, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewSigner(t, "identity-1")
	require.NoError(t, httpapi.Register(e, svc, streams, httpapi.Options{
		Verifier:	authn.NewVerifier(time.Second, admin.Trust(), identity.Trust()), Callers: []string{"admin"},
		Heartbeat:	200 * time.Millisecond, MaxStreamAge: time.Minute, Retry: time.Second, Buffer: 8, MaxTopics: 4,
		MaxPresenceIDs:	10, MaxSyncWindows: 10, Logger: logger.Logger, Registerer: prometheus.NewRegistry(),
	}))
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
	const alice, bob = "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"
	who := func(id string) string { return url.Values{"realm": {"staff"}, "userId": {id}}.Encode() }
	presenceOf := func(id string) app.Presence {
		t.Helper()
		rec := call(adminToken, http.MethodGet, "/v1/realtime/presence?realm=staff&ids="+id, nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var out struct{ Items []app.Presence }
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
		require.Len(t, out.Items, 1)
		return out.Items[0]
	}
	assert.Equal(t, "offline", presenceOf(alice).Status)
	message := "Preparing the board pack"
	rec := call(adminToken, http.MethodPut, "/v1/realtime/status?"+who(alice), map[string]any{"status": "busy", "message": message})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, "offline", presenceOf(alice).Status)
	assert.Equal(t, message, *presenceOf(alice).Message)
	require.NotEmpty(t, hints.Sent)
	assert.Equal(t, "presence.staff", hints.Sent[len(hints.Sent)-1].Target.Topic)
	require.NoError(t, svc.Connected(ctx, "staff", alice, true))
	p := presenceOf(alice)
	assert.Equal(t, "busy", p.Status)
	assert.Equal(t, "manual", p.Source)
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPut, "/v1/realtime/status?"+who(alice),
		map[string]any{"status": "invented"}).Code)
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPut, "/v1/realtime/status?"+who(alice),
		map[string]any{"status": "busy", "expiresAt": time.Now().Add(-time.Minute)}).Code)
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPut, "/v1/realtime/status?"+who(alice),
		map[string]any{"status": "busy", "message": strings.Repeat("x", 101)}).Code)
	rec = call(adminToken, http.MethodDelete, "/v1/realtime/status?"+who(alice), nil)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "available", presenceOf(alice).Status)
	assert.Equal(t, http.StatusNoContent, call(adminToken, http.MethodPost, "/v1/realtime/activity?"+who(alice), map[string]string{"state": "idle"}).Code)
	p = presenceOf(alice)
	assert.Equal(t, "away", p.Status)
	assert.Equal(t, "idle", p.Connection)
	call(adminToken, http.MethodPost, "/v1/realtime/activity?"+who(alice), map[string]string{"state": "active"})
	now := time.Now().UTC()
	meeting := map[string]any{"realm": "staff", "source": "calendar", "sourceId": "evt-1", "kind": "meeting",
		"startsAt":	now.Add(-10 * time.Minute), "endsAt": now.Add(50 * time.Minute), "userIds": []string{alice, bob}}
	require.Equal(t, http.StatusNoContent, call(adminToken, http.MethodPut, "/v1/realtime/windows", meeting).Code)
	p = presenceOf(alice)
	assert.Equal(t, "in_meeting", p.Status)
	assert.Equal(t, "calendar", p.Source)
	require.NotNil(t, p.Until)
	assert.Equal(t, "in_meeting", presenceOf(bob).Status, "a meeting shows even while offline")
	meeting["userIds"] = []string{alice}
	require.Equal(t, http.StatusNoContent, call(adminToken, http.MethodPut, "/v1/realtime/windows", meeting).Code)
	assert.Equal(t, "offline", presenceOf(bob).Status, "Bob left the meeting")
	call(adminToken, http.MethodPut, "/v1/realtime/status?"+who(alice), map[string]any{"status": "available"})
	assert.Equal(t, "available", presenceOf(alice).Status, "a chosen status wins over a meeting (it ended early)")
	require.Equal(t, http.StatusNoContent, call(adminToken, http.MethodPut, "/v1/realtime/windows", map[string]any{
		"realm":	"staff", "source": "leave", "sourceId": "lv-1", "kind": "leave",
		"startsAt":	now.Add(-time.Hour), "endsAt": now.Add(48 * time.Hour), "userIds": []string{alice}}).Code)
	assert.Equal(t, "on_leave", presenceOf(alice).Status, "leave wins over a chosen status")
	rec = call(adminToken, http.MethodGet, "/v1/realtime/status?"+who(alice), nil)
	var mine app.Mine
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &mine))
	assert.Equal(t, "on_leave", mine.Presence.Status)
	require.NotNil(t, mine.Chosen)
	assert.Len(t, mine.Upcoming, 2)
	assert.Equal(t, http.StatusNoContent, call(adminToken, http.MethodDelete, "/v1/realtime/windows?realm=staff&source=leave&sourceId=lv-1", nil).Code)
	assert.Equal(t, http.StatusNotFound, call(adminToken, http.MethodDelete, "/v1/realtime/windows?realm=staff&source=leave&sourceId=lv-1", nil).Code)
	call(adminToken, http.MethodPut, "/v1/realtime/status?"+who(alice), map[string]any{"status": "offline"})
	p = presenceOf(alice)
	assert.Equal(t, "offline", p.Status)
	assert.Equal(t, "offline", p.Connection)
	call(adminToken, http.MethodDelete, "/v1/realtime/status?"+who(alice), nil)
	rec = call(adminToken, http.MethodPost, "/v1/realtime/windows/sync", map[string]any{"realm": "staff", "source": "calendar",
		"from":	now.Add(-time.Hour), "until": now.Add(14 * 24 * time.Hour), "windows": []map[string]any{
			{"sourceId": "evt-2", "kind": "meeting", "startsAt": now.Add(time.Hour), "endsAt": now.Add(2 * time.Hour), "userIds": []string{bob}}}})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, "available", presenceOf(alice).Status, "evt-1 is gone")
	hints.Sent = nil
	require.Equal(t, http.StatusAccepted, call(adminToken, http.MethodPost, "/v1/realtime/publish", map[string]any{
		"topics":	[]string{"entity.invoice.inv-1"}, "users": []map[string]string{{"realm": "staff", "id": bob}},
		"type":	"entity.changed", "data": map[string]string{"id": "inv-1"}}).Code)
	assert.Len(t, hints.Sent, 2)
	assert.Equal(t, http.StatusUnprocessableEntity, call(adminToken, http.MethodPost, "/v1/realtime/publish", map[string]any{
		"topics":	[]string{"presence.staff"}, "type": "presence.changed"}).Code)
	itToken := identity.Sign(t, authntest.Token{Subject: "it-1", Realm: authn.RealmIT, Roles: []string{"it_support"}, SessionID: "sess-1"})
	rec = call(itToken, http.MethodPut, "/v1/realtime/me/status", map[string]any{"status": "do_not_disturb"})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, http.StatusUnauthorized, call(adminToken, http.MethodGet, "/v1/realtime/me/status", nil).Code)
	assert.Equal(t, http.StatusUnauthorized, call(itToken, http.MethodGet, "/v1/realtime/status?"+who(alice), nil).Code)
	server := httptest.NewUnstartedServer(telemetry.Handler("realtime", e))
	server.Config.WriteTimeout = time.Second
	server.Start()
	t.Cleanup(server.Close)
	open := func(token, path string) (*http.Response, *bufio.Reader) {
		t.Helper()
		req, err := http.NewRequest(http.MethodGet, server.URL+path, nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "text/event-stream")
		res, err := server.Client().Do(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode)
		assert.Contains(t, res.Header.Get("Content-Type"), "text/event-stream")
		return res, bufio.NewReader(res.Body)
	}
	next := func(r *bufio.Reader) map[string]any {
		t.Helper()
		for {
			line, err := r.ReadString('\n')
			require.NoError(t, err)
			if data, ok := strings.CutPrefix(strings.TrimSpace(line), "data: "); ok {
				var ev map[string]any
				require.NoError(t, json.Unmarshal([]byte(data), &ev))
				return ev
			}
		}
	}
	res, events := open(adminToken, "/v1/realtime/stream?"+who(bob)+"&topics=entity.invoice.inv-1&session=s-9")
	ready := next(events)
	assert.Equal(t, httpapi.EventReady, ready["type"])
	assert.Equal(t, "online", presenceOf(bob).Connection)
	time.Sleep(1500 * time.Millisecond)
	assert.Equal(t, 1, subscriber.Dispatch(streams, "live.user.staff."+bob, []byte(`{"type":"notification.created","data":{"id":"n1"}}`)))
	assert.Equal(t, "notification.created", next(events)["type"], "the stream outlives the write timeout")
	assert.Equal(t, 1, subscriber.Dispatch(streams, "live.topic.entity.invoice.inv-1", []byte("{\n\"type\": \"entity.changed\"\n}")))
	assert.Equal(t, "entity.changed", next(events)["type"], "multi-line JSON is compacted to one data line")
	assert.Equal(t, 0, subscriber.Dispatch(streams, "live.user.staff."+bob, []byte(`not json`)))
	assert.Equal(t, 1, streams.CloseSession("s-9"))
	closed := next(events)
	assert.Equal(t, httpapi.EventClosed, closed["type"])
	_ = res.Body.Close()
	assert.Eventually(t, func() bool { return presenceOf(bob).Connection == "offline" }, 5*time.Second, 50*time.Millisecond)
	res, events = open(itToken, "/v1/realtime/me/stream")
	ready = next(events)
	topics, _ := ready["data"].(map[string]any)["topics"].([]any)
	assert.ElementsMatch(t, []any{"it.platform", "it.tickets", "presence.it"}, topics)
	_ = res.Body.Close()
	rec = call(adminToken, http.MethodGet, "/v1/realtime/presence?realm=staff&ids=a,b,c,d,e,f,g,h,i,j,k", nil)
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
}
