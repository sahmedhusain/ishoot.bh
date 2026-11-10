package telemetry
import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"platform.local/backend/pkg/config"
)
func TestHandlerContinuesTheCallersTrace(t *testing.T) {
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "test"}))
	shutdown, err := Setup(context.Background(), cfg)
	require.NoError(t, err)
	defer func() { _ = shutdown(context.Background()) }()
	var seen trace.SpanContext
	e := echo.New()
	e.Use(EchoMiddleware())
	e.GET("/items/:id", func(c echo.Context) error {
		seen = trace.SpanFromContext(c.Request().Context()).SpanContext()
		return c.NoContent(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/items/1", nil)
	req.Header.Set("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")
	Handler("test", e).ServeHTTP(httptest.NewRecorder(), req)
	require.True(t, seen.IsValid())
	assert.Equal(t, "4bf92f3577b34da6a3ce929d0e0e4736", seen.TraceID().String())
}
