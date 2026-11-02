// Package httpx builds the Echo server every service runs, with one standard middleware chain, problem-detail
// errors, Prometheus metrics, an internal admin listener and graceful shutdown.
package httpx

import (
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/logx"
)

// HeaderRequestID carries the request ID between the front ends, the gateway and the services.
const HeaderRequestID = echo.HeaderXRequestID

// An inbound request ID is reused only if it looks like one, so clients cannot inject arbitrary text into logs.
var requestIDPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{8,128}$`)

// New returns an Echo instance with the standard middleware chain. Routes are added by the caller.
func New(cfg config.Common, logger *logx.Logger, metrics *Metrics) (*echo.Echo, error) {
	e := echo.New()
	e.HideBanner, e.HidePort = true, true
	e.HTTPErrorHandler = ErrorHandler(logger)

	extractor, err := ipExtractor(cfg.HTTP.TrustedProxies)
	if err != nil {
		return nil, err
	}
	e.IPExtractor = extractor

	e.Use(recoverer(logger))
	e.Use(middleware.RequestIDWithConfig(middleware.RequestIDConfig{
		Generator: uuid.NewString,
		RequestIDHandler: func(c echo.Context, id string) {
			// Keep the ID on the request too, so handlers and proxies pass it on to the next service.
			c.Request().Header.Set(HeaderRequestID, id)
			ctx := logx.WithAttrs(c.Request().Context(), slog.String("request_id", id))
			c.SetRequest(c.Request().WithContext(ctx))
		},
	}))
	e.Pre(keepValidRequestID)
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		XSSProtection:         "0",
		ContentTypeNosniff:    "nosniff",
		XFrameOptions:         "DENY",
		HSTSMaxAge:            hstsMaxAge(cfg),
		ContentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'",
		ReferrerPolicy:        "no-referrer",
	}))
	e.Use(middleware.BodyLimit(cfg.HTTP.BodyLimit))
	e.Use(middleware.ContextTimeoutWithConfig(middleware.ContextTimeoutConfig{Timeout: cfg.HTTP.RequestTimeout, Skipper: IsStream}))
	if len(cfg.HTTP.CORSOrigins) > 0 {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins:     cfg.HTTP.CORSOrigins,
			AllowCredentials: true,
			ExposeHeaders:    []string{HeaderRequestID},
			MaxAge:           int((10 * time.Minute).Seconds()),
		}))
	}
	if metrics != nil {
		e.Use(metrics.Middleware())
	}
	e.Use(accessLog(logger))
	return e, nil
}

// IsStream reports whether the request asks for a Server-Sent Events stream. A stream manages its own lifetime
// (heartbeats and a maximum age), so the request timeout does not apply; its handler lifts the write deadline with
// KeepStreaming.
func IsStream(c echo.Context) bool {
	return strings.Contains(c.Request().Header.Get(echo.HeaderAccept), "text/event-stream")
}

// KeepStreaming lifts the server's write timeout for one response, so a stream outlives HTTP_WRITE_TIMEOUT.
func KeepStreaming(w http.ResponseWriter) error {
	return http.NewResponseController(w).SetWriteDeadline(time.Time{})
}

func hstsMaxAge(cfg config.Common) int {
	if cfg.IsDevelopment() || cfg.AppEnv == config.EnvTest {
		return 0
	}
	return int((365 * 24 * time.Hour).Seconds())
}

// keepValidRequestID drops an inbound request ID that does not match the expected shape, so a new one is generated.
func keepValidRequestID(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if id := c.Request().Header.Get(HeaderRequestID); id != "" && !requestIDPattern.MatchString(id) {
			c.Request().Header.Del(HeaderRequestID)
		}
		return next(c)
	}
}

func ipExtractor(trusted []string) (echo.IPExtractor, error) {
	if len(trusted) == 0 {
		return echo.ExtractIPDirect(), nil
	}
	options := make([]echo.TrustOption, 0, len(trusted)+3)
	options = append(options, echo.TrustLoopback(false), echo.TrustLinkLocal(false), echo.TrustPrivateNet(false))
	for _, cidr := range trusted {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			return nil, err
		}
		options = append(options, echo.TrustIPRange(network))
	}
	return echo.ExtractIPFromXFFHeader(options...), nil
}

func recoverer(logger *logx.Logger) echo.MiddlewareFunc {
	return middleware.RecoverWithConfig(middleware.RecoverConfig{
		DisablePrintStack: true,
		LogErrorFunc: func(c echo.Context, err error, stack []byte) error {
			logger.ErrorContext(c.Request().Context(), "panic recovered", slog.Any("error", err), slog.String("stack", string(stack)))
			return err
		},
	})
}

func accessLog(logger *logx.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			if err != nil {
				c.Error(err)
			}
			res := c.Response()
			level := slog.LevelInfo
			switch {
			case res.Status >= 500:
				level = slog.LevelError
			case res.Status >= 400:
				level = slog.LevelWarn
			}
			logger.LogAttrs(c.Request().Context(), level, "http request",
				slog.String("method", c.Request().Method),
				slog.String("route", routeOf(c)),
				slog.String("path", c.Request().URL.Path),
				slog.Int("status", res.Status),
				slog.Int64("bytes", res.Size),
				slog.Float64("duration_ms", float64(time.Since(start).Microseconds())/1000),
				slog.String("client_ip", c.RealIP()),
			)
			return nil
		}
	}
}

// routeOf returns the route template (not the raw path) so logs and metrics stay low-cardinality.
func routeOf(c echo.Context) string {
	if path := c.Path(); path != "" {
		return path
	}
	return "unmatched"
}
