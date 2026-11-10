package proxy
import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/pkg/telemetry"
)
type TransportConfig struct {
	DialTimeout		time.Duration
	ResponseHeaderTimeout	time.Duration
	IdleConnTimeout		time.Duration
	MaxIdleConnsPerHost	int
}
func NewTransport(cfg TransportConfig) http.RoundTripper {
	base := &http.Transport{
		Proxy:			nil,
		DialContext:		(&net.Dialer{Timeout: cfg.DialTimeout, KeepAlive: 30 * time.Second}).DialContext,
		ResponseHeaderTimeout:	cfg.ResponseHeaderTimeout,
		IdleConnTimeout:	cfg.IdleConnTimeout,
		MaxIdleConns:		cfg.MaxIdleConnsPerHost * 4,
		MaxIdleConnsPerHost:	cfg.MaxIdleConnsPerHost,
		ForceAttemptHTTP2:	true,
	}
	return telemetry.Transport(base)
}
type Target struct {
	Name		string
	Prefix		string
	Upstream	*url.URL
	StripPrefix	bool
}
func Handler(target Target, transport http.RoundTripper, logger *logx.Logger) echo.HandlerFunc {
	rp := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target.Upstream)
			if target.StripPrefix {
				rest := strings.TrimPrefix(r.In.URL.Path, target.Prefix)
				if r.In.URL.Path == strings.TrimSuffix(target.Prefix, "/") {
					rest = ""
				}
				r.Out.URL.Path = singleJoin(target.Upstream.Path, "/"+rest)
				r.Out.URL.RawPath = ""
			}
			r.SetXForwarded()
			r.Out.Header.Set(httpx.HeaderRequestID, r.In.Header.Get(httpx.HeaderRequestID))
		},
		Transport:	transport,
		ModifyResponse: func(res *http.Response) error {
			res.Header.Del("Server")
			res.Header.Del("X-Powered-By")
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			status, code := http.StatusBadGateway, problem.CodeBadGateway
			if errors.Is(err, context.DeadlineExceeded) || isTimeout(err) {
				status, code = http.StatusGatewayTimeout, problem.CodeTimeout
			}
			if errors.Is(err, context.Canceled) {
				return
			}
			logger.ErrorContext(r.Context(), "upstream failed", slog.String("route", target.Name), slog.Any("error", err))
			p := problem.New(status, code, "")
			p.RequestID = w.Header().Get(httpx.HeaderRequestID)
			w.Header().Set(echo.HeaderContentType, problem.ContentType)
			w.WriteHeader(status)
			_ = jsonEncode(w, p)
		},
	}
	return func(c echo.Context) error {
		if hasDotSegment(c.Request().URL.Path) {
			return problem.BadRequest("path must not contain dot segments")
		}
		if httpx.IsStream(c) {
			_ = httpx.KeepStreaming(c.Response())
		}
		rp.ServeHTTP(c.Response(), c.Request())
		return nil
	}
}
func hasDotSegment(path string) bool {
	for _, segment := range strings.Split(path, "/") {
		if segment == "." || segment == ".." {
			return true
		}
	}
	lower := strings.ToLower(path)
	return strings.Contains(lower, "%2e") || strings.Contains(lower, "%2f")
}
func singleJoin(a, b string) string {
	return strings.TrimSuffix(a, "/") + b
}
func isTimeout(err error) bool {
	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
}
