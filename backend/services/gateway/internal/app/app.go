// Package app wires the gateway: the route table, authentication, rate limits and proxies.
package app

import (
	"net/http"
	"net/url"
	"sort"
	"strings"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/ratelimit"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/gateway/internal/proxy"
	"platform.local/backend/services/gateway/internal/routes"
	"platform.local/backend/services/gateway/settings"
)

// Dependencies are the parts the gateway needs from outside.
type Dependencies struct {
	Logger    *logx.Logger
	Metrics   *httpx.Metrics
	Limiter   ratelimit.Limiter
	Verifier  *authn.Verifier // nil when every route is public
	Transport http.RoundTripper
}

// NewHandler builds the gateway's public HTTP handler from its configuration and route table.
func NewHandler(cfg settings.Config, table routes.Table, deps Dependencies) (http.Handler, error) {
	if err := cfg.Auth.ValidateFor(table.NeedsAuth()); err != nil {
		return nil, err
	}
	e, err := httpx.New(cfg.Common, deps.Logger, deps.Metrics)
	if err != nil {
		return nil, err
	}
	e.Use(telemetry.EchoMiddleware())

	// Register longer prefixes first so overlapping prefixes resolve to the most specific route.
	ordered := append([]routes.Route(nil), table.Routes...)
	sort.SliceStable(ordered, func(i, j int) bool { return len(ordered[i].Prefix) > len(ordered[j].Prefix) })
	for _, route := range ordered {
		upstream, err := url.Parse(cfg.Gateway.Upstreams[route.Upstream])
		if err != nil {
			return nil, err
		}
		handler := proxy.Handler(proxy.Target{
			Name: route.Name, Prefix: route.Prefix, Upstream: upstream, StripPrefix: route.StripPrefix,
		}, deps.Transport, deps.Logger)

		var chain []echo.MiddlewareFunc
		if !route.IsPublic() {
			chain = append(chain, authn.Require(deps.Verifier, route.AuthRealms()...))
		}
		chain = append(chain, ratelimit.Middleware(deps.Limiter, ratelimit.Options{
			Rule: table.Rule(route), FailOpen: cfg.Gateway.RateLimitFailOpen, Logger: deps.Logger,
		}))
		e.Any(route.Prefix+"*", handler, chain...)
		e.Any(strings.TrimSuffix(route.Prefix, "/"), handler, chain...)
	}
	return telemetry.Handler(cfg.ServiceName, e), nil
}
