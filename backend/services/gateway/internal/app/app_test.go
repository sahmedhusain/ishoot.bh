package app

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/pkg/ratelimit"
	"platform.local/backend/services/gateway/internal/proxy"
	"platform.local/backend/services/gateway/internal/routes"
	"platform.local/backend/services/gateway/settings"
)

const routesFile = `
rateLimits:
  default: { requests: 100, window: 1m }
  tight: { requests: 2, window: 1m }
routes:
  - { name: auth, prefix: /v1/auth/, upstream: identity, realms: [public], rateLimit: tight }
  - { name: tickets, prefix: /v1/tickets/, upstream: itsm, realms: [staff, it], stripPrefix: true, rateLimit: default }
  - { name: tickets-admin, prefix: /v1/tickets/admin/, upstream: itsm, realms: [it], rateLimit: default }
  - { name: broken, prefix: /v1/broken/, upstream: down, realms: [public], rateLimit: default }
`

type seen struct {
	Path      string `json:"path"`
	RequestID string `json:"requestId"`
	Auth      string `json:"auth"`
	Forwarded string `json:"forwarded"`
}

type fixture struct {
	handler http.Handler
	signer  *authntest.Signer
}

func setup(t *testing.T) fixture {
	t.Helper()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Server", "internal/1.0")
		_ = json.NewEncoder(w).Encode(seen{
			Path: r.URL.Path, RequestID: r.Header.Get(httpx.HeaderRequestID),
			Auth: r.Header.Get("Authorization"), Forwarded: r.Header.Get("X-Forwarded-For"),
		})
	}))
	t.Cleanup(upstream.Close)
	dead := httptest.NewServer(http.NotFoundHandler())
	dead.Close()

	path := filepath.Join(t.TempDir(), "routes.yaml")
	require.NoError(t, os.WriteFile(path, []byte(routesFile), 0o600))

	var cfg settings.Config
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{
		"SERVICE_NAME":        "gateway",
		"APP_ENV":             "test",
		"REDIS_URL":           "redis://unused:6379",
		"GATEWAY_ROUTES_FILE": path,
		"GATEWAY_UPSTREAMS":   "identity=" + upstream.URL + ",itsm=" + upstream.URL + "/api,down=" + dead.URL,
		"AUTH_ISSUER":         authntest.Issuer,
		"AUTH_JWKS_URL":       "http://identity/.well-known/jwks.json",
	}))
	table, err := routes.Load(cfg.Gateway.RoutesFile, cfg.Gateway.Upstreams)
	require.NoError(t, err)

	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	signer := authntest.NewSigner(t, "k1")
	handler, err := NewHandler(cfg, table, Dependencies{
		Logger:    logx.New(io.Discard, logx.Options{}),
		Metrics:   httpx.NewMetrics("gateway"),
		Limiter:   ratelimit.NewRedisLimiter(client, cfg.Gateway.RateLimitPrefix),
		Verifier:  authn.NewVerifier(authn.StaticKeys{Set: signer.Public}, authntest.Issuer, time.Second),
		Transport: proxy.NewTransport(proxy.TransportConfig{DialTimeout: time.Second, ResponseHeaderTimeout: time.Second, IdleConnTimeout: time.Second, MaxIdleConnsPerHost: 4}),
	})
	require.NoError(t, err)
	return fixture{handler: handler, signer: signer}
}

func (f fixture) do(t *testing.T, method, path, token string) (*httptest.ResponseRecorder, seen) {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	req.RemoteAddr = "198.51.100.7:4000"
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	f.handler.ServeHTTP(rec, req)
	var s seen
	if rec.Code == http.StatusOK {
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &s))
	}
	return rec, s
}

func TestPublicRouteIsProxied(t *testing.T) {
	f := setup(t)
	rec, s := f.do(t, http.MethodPost, "/v1/auth/login", "")
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "/v1/auth/login", s.Path)
	assert.NotEmpty(t, s.RequestID, "the request ID reaches the upstream")
	assert.Equal(t, rec.Header().Get(httpx.HeaderRequestID), s.RequestID)
	assert.Equal(t, "198.51.100.7", s.Forwarded)
	assert.Empty(t, rec.Header().Get("Server"), "upstream server banners are removed")
}

func TestProtectedRouteNeedsATokenOfAnAllowedRealm(t *testing.T) {
	f := setup(t)
	rec, _ := f.do(t, http.MethodGet, "/v1/tickets/1", "")
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Equal(t, problem.ContentType, rec.Header().Get("Content-Type"))

	customer := f.signer.Sign(t, authntest.Token{Realm: authn.RealmCustomer})
	rec, _ = f.do(t, http.MethodGet, "/v1/tickets/1", customer)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)

	staff := f.signer.Sign(t, authntest.Token{Realm: authn.RealmStaff})
	rec, s := f.do(t, http.MethodGet, "/v1/tickets/1", staff)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "/api/1", s.Path, "the prefix is replaced by the upstream base path")
	assert.Equal(t, "Bearer "+staff, s.Auth, "services verify the token again")
}

func TestMostSpecificPrefixWins(t *testing.T) {
	f := setup(t)
	staff := f.signer.Sign(t, authntest.Token{Realm: authn.RealmStaff})
	rec, _ := f.do(t, http.MethodGet, "/v1/tickets/admin/queue", staff)
	assert.Equal(t, http.StatusUnauthorized, rec.Code, "the IT-only route applies, not the broader staff route")

	it := f.signer.Sign(t, authntest.Token{Realm: authn.RealmIT})
	rec, s := f.do(t, http.MethodGet, "/v1/tickets/admin/queue", it)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "/api/v1/tickets/admin/queue", s.Path)
}

func TestRateLimitPerRoute(t *testing.T) {
	f := setup(t)
	for range 2 {
		rec, _ := f.do(t, http.MethodPost, "/v1/auth/login", "")
		require.Equal(t, http.StatusOK, rec.Code)
	}
	rec, _ := f.do(t, http.MethodPost, "/v1/auth/login", "")
	assert.Equal(t, http.StatusTooManyRequests, rec.Code)
	assert.NotEmpty(t, rec.Header().Get("Retry-After"))
}

func TestUpstreamFailureAndUnknownPaths(t *testing.T) {
	f := setup(t)
	rec, _ := f.do(t, http.MethodGet, "/v1/broken/x", "")
	assert.Equal(t, http.StatusBadGateway, rec.Code)
	assert.Contains(t, rec.Body.String(), problem.CodeBadGateway)

	rec, _ = f.do(t, http.MethodGet, "/v1/unknown", "")
	assert.Equal(t, http.StatusNotFound, rec.Code)

	rec, _ = f.do(t, http.MethodGet, "/v1/auth/%2e%2e/tickets/admin/queue", "")
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestAuthSettingsRequiredForProtectedRoutes(t *testing.T) {
	table, err := routes.Parse([]byte(routesFile), map[string]string{"identity": "http://a", "itsm": "http://b", "down": "http://c"})
	require.NoError(t, err)
	_, err = NewHandler(settings.Config{}, table, Dependencies{})
	assert.ErrorContains(t, err, "AUTH_ISSUER")
	assert.True(t, strings.Contains(err.Error(), "JWKS"))
}
