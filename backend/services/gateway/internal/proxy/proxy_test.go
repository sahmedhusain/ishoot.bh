package proxy_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/gateway/internal/proxy"
)

func TestNewTransport(t *testing.T) {
	cfg := proxy.TransportConfig{
		DialTimeout:           time.Second,
		ResponseHeaderTimeout: time.Second,
		IdleConnTimeout:       time.Second,
		MaxIdleConnsPerHost:   10,
	}
	tr := proxy.NewTransport(cfg)
	require.NotNil(t, tr)
}

func TestProxyHandlerSuccessAndHeaderStripping(t *testing.T) {
	// Setup upstream mock server
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/items", r.URL.Path)
		assert.Equal(t, "req-12345", r.Header.Get(httpx.HeaderRequestID))
		assert.NotEmpty(t, r.Header.Get("X-Forwarded-For"))

		w.Header().Set("Server", "UpstreamServer/1.0")
		w.Header().Set("X-Powered-By", "Express")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	t.Cleanup(upstream.Close)

	upstreamURL, err := url.Parse(upstream.URL)
	require.NoError(t, err)

	logger := logx.New(io.Discard, logx.Options{})
	tr := proxy.NewTransport(proxy.TransportConfig{
		DialTimeout:           time.Second,
		ResponseHeaderTimeout: time.Second,
		IdleConnTimeout:       time.Second,
		MaxIdleConnsPerHost:   5,
	})

	handler := proxy.Handler(proxy.Target{
		Name:        "test-service",
		Prefix:      "/api/test/",
		Upstream:    upstreamURL,
		StripPrefix: true,
	}, tr, logger)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/test/v1/items", nil)
	req.Header.Set(httpx.HeaderRequestID, "req-12345")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err = handler(c)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"ok"}`, rec.Body.String())
	assert.Empty(t, rec.Header().Get("Server"), "Server header should be stripped")
	assert.Empty(t, rec.Header().Get("X-Powered-By"), "X-Powered-By header should be stripped")
}

func TestProxyHandlerDotSegmentsBlocked(t *testing.T) {
	upstreamURL, _ := url.Parse("http://localhost:9999")
	logger := logx.New(io.Discard, logx.Options{})
	tr := http.DefaultTransport

	handler := proxy.Handler(proxy.Target{
		Name:     "test",
		Prefix:   "/api",
		Upstream: upstreamURL,
	}, tr, logger)

	badPaths := []string{
		"/api/../secret",
		"/api/./secret",
		"/api/%2e%2e/secret",
		"/api/%2e/secret",
	}

	e := echo.New()
	for _, p := range badPaths {
		t.Run(p, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, p, nil)
			req.URL.RawPath = p
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			err := handler(c)
			require.Error(t, err)
			var prob *problem.Problem
			require.ErrorAs(t, err, &prob)
			assert.Equal(t, http.StatusBadRequest, prob.Status)
			assert.Contains(t, prob.Detail, "path must not contain dot segments")
		})
	}
}

func TestProxyHandlerUpstreamBadGateway(t *testing.T) {
	// Point to closed port
	upstreamURL, _ := url.Parse("http://127.0.0.1:54321")
	logger := logx.New(io.Discard, logx.Options{})
	tr := http.DefaultTransport

	handler := proxy.Handler(proxy.Target{
		Name:     "down-service",
		Prefix:   "/api",
		Upstream: upstreamURL,
	}, tr, logger)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadGateway, rec.Code)
	assert.Contains(t, rec.Body.String(), "bad_gateway")
}

func TestProxyHandlerUpstreamTimeout(t *testing.T) {
	// Upstream that blocks
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
	}))
	t.Cleanup(upstream.Close)

	upstreamURL, _ := url.Parse(upstream.URL)
	logger := logx.New(io.Discard, logx.Options{})
	tr := proxy.NewTransport(proxy.TransportConfig{
		DialTimeout:           50 * time.Millisecond,
		ResponseHeaderTimeout: 50 * time.Millisecond,
	})

	handler := proxy.Handler(proxy.Target{
		Name:     "slow-service",
		Prefix:   "/api",
		Upstream: upstreamURL,
	}, tr, logger)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	ctx, cancel := context.WithTimeout(req.Context(), 50*time.Millisecond)
	defer cancel()
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusGatewayTimeout, rec.Code)
	assert.Contains(t, rec.Body.String(), "timeout")
}

func TestProxyHandlerStreaming(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("data: hello\n\n"))
	}))
	t.Cleanup(upstream.Close)

	upstreamURL, _ := url.Parse(upstream.URL)
	logger := logx.New(io.Discard, logx.Options{})
	tr := http.DefaultTransport

	handler := proxy.Handler(proxy.Target{
		Name:     "stream-service",
		Prefix:   "/stream",
		Upstream: upstreamURL,
	}, tr, logger)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/stream", nil)
	req.Header.Set("Accept", "text/event-stream")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler(c)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "data: hello")
}
