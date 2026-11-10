package httpx
import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/logx"
)
func TestAdminProbes(t *testing.T) {
	logger := logx.New(io.Discard, logx.Options{})
	checker := health.NewChecker("test", "1", time.Second)
	admin := AdminHandler(testConfig(t, nil), logger, checker, nil)
	rec := httptest.NewRecorder()
	admin.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/livez", nil))
	assert.Equal(t, http.StatusOK, rec.Code)
	checker.Register("db", func(context.Context) error { return errors.New("down") })
	rec = httptest.NewRecorder()
	admin.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
	assert.Contains(t, rec.Body.String(), `"db"`)
}
func TestAdminChangesLogLevel(t *testing.T) {
	logger := logx.New(io.Discard, logx.Options{Level: "info"})
	admin := AdminHandler(testConfig(t, nil), logger, health.NewChecker("t", "1", time.Second), nil)
	rec := httptest.NewRecorder()
	admin.ServeHTTP(rec, httptest.NewRequest(http.MethodPut, "/runtime/log-level", strings.NewReader(`{"level":"debug"}`)))
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "DEBUG", logger.Level().String())
	rec = httptest.NewRecorder()
	admin.ServeHTTP(rec, httptest.NewRequest(http.MethodPut, "/runtime/log-level", strings.NewReader(`{"level":"verbose"}`)))
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}
func TestPprofOnlyWhenEnabled(t *testing.T) {
	logger := logx.New(io.Discard, logx.Options{})
	checker := health.NewChecker("t", "1", time.Second)
	rec := httptest.NewRecorder()
	AdminHandler(testConfig(t, nil), logger, checker, nil).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/debug/pprof/", nil))
	assert.Equal(t, http.StatusNotFound, rec.Code)
	rec = httptest.NewRecorder()
	enabled := testConfig(t, map[string]string{"ADMIN_ENABLE_PPROF": "true"})
	AdminHandler(enabled, logger, checker, nil).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/debug/pprof/", nil))
	assert.Equal(t, http.StatusOK, rec.Code)
}
