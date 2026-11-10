package app
import (
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/ratelimit"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/gateway/internal/proxy"
	"platform.local/backend/services/gateway/internal/routes"
	"platform.local/backend/services/gateway/settings"
)
type Dependencies struct {
	Logger		*logx.Logger
	Metrics		*httpx.Metrics
	Limiter		ratelimit.Limiter
	Verifier	*authn.Verifier
	Transport	http.RoundTripper
}
func NewHandler(cfg settings.Config, table routes.Table, deps Dependencies) (http.Handler, error) {
	if table.NeedsAuth() && (deps.Verifier == nil || !cfg.Auth.Configured()) {
		return nil, fmt.Errorf("gateway: a route needs a token: set AUTH_ISSUER and AUTH_JWKS_URL, or AUTH_SERVICE_KEYS_FILE")
	}
	var statusClient *http.Client
	for _, route := range table.Routes {
		if route.IsPublic() {
			continue
		}
		for _, realm := range route.AuthRealms() {
			if realm == authn.RealmService {
				continue
			}
			u, err := url.Parse(cfg.Gateway.IdentityStatusURL)
			if err != nil || u == nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || cfg.Gateway.IdentityStatusTimeout <= 0 {
				return nil, fmt.Errorf("gateway: user routes require a valid GATEWAY_IDENTITY_STATUS_URL and timeout")
			}
			statusClient = &http.Client{Transport: deps.Transport, Timeout: cfg.Gateway.IdentityStatusTimeout, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
		}
	}
	e, err := httpx.New(cfg.Common, deps.Logger, deps.Metrics)
	if err != nil {
		return nil, err
	}
	e.Use(telemetry.EchoMiddleware())
	ordered := append([]routes.Route(nil), table.Routes...)
	sort.SliceStable(ordered, func(i, j int) bool { return len(ordered[i].Prefix) > len(ordered[j].Prefix) })
	for _, route := range ordered {
		upstream, err := url.Parse(cfg.Gateway.Upstreams[route.Upstream])
		if err != nil {
			return nil, err
		}
		handler := proxy.Handler(proxy.Target{
			Name:	route.Name, Prefix: route.Prefix, Upstream: upstream, StripPrefix: route.StripPrefix,
		}, deps.Transport, deps.Logger)
		chain := []echo.MiddlewareFunc{middleware.BodyLimit(table.BodyLimit(route))}
		if !route.IsPublic() {
			chain = append(chain, authn.Require(deps.Verifier, route.AuthRealms()...))
		}
		chain = append(chain, ratelimit.Middleware(deps.Limiter, ratelimit.Options{
			Rule:	table.Rule(route), FailOpen: cfg.Gateway.RateLimitFailOpen, Logger: deps.Logger,
		}))
		if !route.IsPublic() && statusClient != nil {
			chain = append(chain, requireActiveSession(statusClient, cfg.Gateway.IdentityStatusURL))
		}
		e.Any(route.Prefix+"*", handler, chain...)
		e.Any(strings.TrimSuffix(route.Prefix, "/"), handler, chain...)
	}
	return telemetry.Handler(cfg.ServiceName, e), nil
}
