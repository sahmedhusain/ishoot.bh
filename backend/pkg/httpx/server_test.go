package httpx
import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
)
func testConfig(t *testing.T, env map[string]string) config.Common {
	t.Helper()
	values := map[string]string{"SERVICE_NAME": "test", "APP_ENV": "test", "HTTP_BODY_LIMIT": "1K"}
	for k, v := range env {
		values[k] = v
	}
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, values))
	return cfg
}
func newServer(t *testing.T, env map[string]string) (*echo.Echo, *bytes.Buffer, *Metrics) {
	t.Helper()
	var logs bytes.Buffer
	logger := logx.New(&logs, logx.Options{Level: "debug", Service: "test"})
	metrics := NewMetrics("test")
	e, err := New(testConfig(t, env), logger, metrics)
	require.NoError(t, err)
	e.GET("/ok", func(c echo.Context) error { return c.JSON(http.StatusOK, map[string]string{"ip": c.RealIP()}) })
	e.GET("/missing", func(echo.Context) error { return problem.NotFound("ticket") })
	e.GET("/crash", func(echo.Context) error { return errors.New("database password leaked") })
	e.GET("/panic", func(echo.Context) error { panic("boom") })
	e.POST("/echo", func(c echo.Context) error {
		body, _ := io.ReadAll(c.Request().Body)
		return c.String(http.StatusOK, string(body))
	})
	return e, &logs, metrics
}
func do(e *echo.Echo, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}
func decodeProblem(t *testing.T, rec *httptest.ResponseRecorder) problem.Problem {
	t.Helper()
	assert.Equal(t, problem.ContentType, rec.Header().Get(echo.HeaderContentType))
	var p problem.Problem
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &p))
	return p
}
func TestRequestIDIsGeneratedOrKept(t *testing.T) {
	e, _, _ := newServer(t, nil)
	rec := do(e, httptest.NewRequest(http.MethodGet, "/ok", nil))
	assert.Len(t, rec.Header().Get(HeaderRequestID), 36)
	req := httptest.NewRequest(http.MethodGet, "/ok", nil)
	req.Header.Set(HeaderRequestID, "client-trace-0001")
	assert.Equal(t, "client-trace-0001", do(e, req).Header().Get(HeaderRequestID))
	req = httptest.NewRequest(http.MethodGet, "/ok", nil)
	req.Header.Set(HeaderRequestID, "bad id\nwith newline")
	assert.NotContains(t, do(e, req).Header().Get(HeaderRequestID), "bad")
}
func TestSecurityHeaders(t *testing.T) {
	e, _, _ := newServer(t, nil)
	rec := do(e, httptest.NewRequest(http.MethodGet, "/ok", nil))
	assert.Equal(t, "nosniff", rec.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", rec.Header().Get("X-Frame-Options"))
	assert.Equal(t, "no-referrer", rec.Header().Get("Referrer-Policy"))
}
func TestErrorsBecomeProblems(t *testing.T) {
	e, logs, _ := newServer(t, nil)
	p := decodeProblem(t, do(e, httptest.NewRequest(http.MethodGet, "/missing", nil)))
	assert.Equal(t, http.StatusNotFound, p.Status)
	assert.Equal(t, "ticket", p.Detail)
	assert.NotEmpty(t, p.RequestID)
	p = decodeProblem(t, do(e, httptest.NewRequest(http.MethodGet, "/crash", nil)))
	assert.Equal(t, http.StatusInternalServerError, p.Status)
	assert.Empty(t, p.Detail, "internal causes are never sent to the client")
	assert.Contains(t, logs.String(), "database password leaked", "but they are logged")
	p = decodeProblem(t, do(e, httptest.NewRequest(http.MethodGet, "/nowhere", nil)))
	assert.Equal(t, problem.CodeNotFound, p.Code)
	p = decodeProblem(t, do(e, httptest.NewRequest(http.MethodGet, "/panic", nil)))
	assert.Equal(t, http.StatusInternalServerError, p.Status)
	assert.Contains(t, logs.String(), "panic recovered")
}
func TestBodyLimit(t *testing.T) {
	e, _, _ := newServer(t, nil)
	rec := do(e, httptest.NewRequest(http.MethodPost, "/echo", strings.NewReader(strings.Repeat("x", 2048))))
	assert.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)
	assert.Equal(t, problem.CodeTooLarge, decodeProblem(t, rec).Code)
}
func TestClientIPTrustsOnlyConfiguredProxies(t *testing.T) {
	direct, _, _ := newServer(t, nil)
	req := httptest.NewRequest(http.MethodGet, "/ok", nil)
	req.RemoteAddr = "10.1.2.3:5000"
	req.Header.Set("X-Forwarded-For", "203.0.113.9")
	assert.Contains(t, do(direct, req).Body.String(), "10.1.2.3")
	proxied, _, _ := newServer(t, map[string]string{"HTTP_TRUSTED_PROXIES": "10.0.0.0/8"})
	assert.Contains(t, do(proxied, req).Body.String(), "203.0.113.9")
}
func TestCORSAllowsOnlyConfiguredOrigins(t *testing.T) {
	e, _, _ := newServer(t, map[string]string{"HTTP_CORS_ORIGINS": "https://admin.example"})
	req := httptest.NewRequest(http.MethodGet, "/ok", nil)
	req.Header.Set("Origin", "https://admin.example")
	assert.Equal(t, "https://admin.example", do(e, req).Header().Get("Access-Control-Allow-Origin"))
	req.Header.Set("Origin", "https://evil.example")
	assert.Empty(t, do(e, req).Header().Get("Access-Control-Allow-Origin"))
}
func TestMetricsUseRouteTemplates(t *testing.T) {
	e, _, metrics := newServer(t, nil)
	do(e, httptest.NewRequest(http.MethodGet, "/ok", nil))
	do(e, httptest.NewRequest(http.MethodGet, "/random/abc", nil))
	logger := logx.New(io.Discard, logx.Options{})
	admin := AdminHandler(testConfig(t, nil), logger, health.NewChecker("test", "1", 0), metrics)
	rec := httptest.NewRecorder()
	admin.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	body := rec.Body.String()
	assert.Contains(t, body, `http_requests_total{method="GET",route="/ok",service="test",status="200"} 1`)
	assert.Contains(t, body, `route="unmatched"`)
	assert.NotContains(t, body, "/random/abc")
}
