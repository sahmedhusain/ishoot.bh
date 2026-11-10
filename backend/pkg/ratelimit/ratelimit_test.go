package ratelimit
import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"github.com/alicebob/miniredis/v2"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
)
func setup(t *testing.T, failOpen bool) (*echo.Echo, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1, DialTimeout: 100 * time.Millisecond})
	t.Cleanup(func() { _ = client.Close() })
	logger := logx.New(io.Discard, logx.Options{})
	e := echo.New()
	e.HTTPErrorHandler = httpx.ErrorHandler(logger)
	e.GET("/", func(c echo.Context) error { return c.NoContent(http.StatusNoContent) },
		Middleware(NewRedisLimiter(client, "rl:"), Options{
			Rule:		Rule{Name: "test", Requests: 2, Window: time.Minute},
			FailOpen:	failOpen,
			Logger:		logger,
		}))
	return e, mr
}
func call(e *echo.Echo, ip string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = ip + ":1234"
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}
func TestLimitsPerClient(t *testing.T) {
	e, _ := setup(t, false)
	assert.Equal(t, http.StatusNoContent, call(e, "192.0.2.1").Code)
	second := call(e, "192.0.2.1")
	assert.Equal(t, http.StatusNoContent, second.Code)
	assert.Equal(t, "2", second.Header().Get("RateLimit-Limit"))
	blocked := call(e, "192.0.2.1")
	assert.Equal(t, http.StatusTooManyRequests, blocked.Code)
	assert.NotEmpty(t, blocked.Header().Get("Retry-After"))
	assert.Equal(t, http.StatusNoContent, call(e, "192.0.2.2").Code, "other clients are counted separately")
}
func TestStoreOutage(t *testing.T) {
	closed, mr := setup(t, false)
	mr.Close()
	assert.Equal(t, http.StatusServiceUnavailable, call(closed, "192.0.2.1").Code)
	open, mr2 := setup(t, true)
	mr2.Close()
	assert.Equal(t, http.StatusNoContent, call(open, "192.0.2.1").Code)
}
func TestRuleValidate(t *testing.T) {
	require.NoError(t, Rule{Name: "a", Requests: 1, Window: time.Second}.Validate())
	assert.Error(t, Rule{Name: "a", Requests: 0, Window: time.Second}.Validate())
	assert.Error(t, Rule{Requests: 1, Window: time.Second}.Validate())
}
