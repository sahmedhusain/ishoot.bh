// Package settings is the gateway's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/redisx"
)

// Config is the gateway's configuration. Every value comes from the environment (see README.md).
type Config struct {
	config.Common
	Redis   redisx.Config `envPrefix:"REDIS_"`
	Gateway Gateway       `envPrefix:"GATEWAY_"`
	Auth    authn.Config  `envPrefix:"AUTH_"`
}

// Gateway holds the routing settings.
type Gateway struct {
	RoutesFile string `env:"ROUTES_FILE" validate:"required,file"`
	// Upstreams maps upstream names used in the routes file to base URLs: "identity=http://identity:8080,…".
	Upstreams             map[string]string `env:"UPSTREAMS" envSeparator:"," envKeyValSeparator:"=" validate:"dive,url"`
	DialTimeout           time.Duration     `env:"UPSTREAM_DIAL_TIMEOUT" envDefault:"3s" validate:"gt=0"`
	ResponseHeaderTimeout time.Duration     `env:"UPSTREAM_RESPONSE_TIMEOUT" envDefault:"20s" validate:"gt=0"`
	IdleConnTimeout       time.Duration     `env:"UPSTREAM_IDLE_TIMEOUT" envDefault:"90s" validate:"gt=0"`
	MaxIdleConnsPerHost   int               `env:"UPSTREAM_MAX_IDLE_CONNS_PER_HOST" envDefault:"64" validate:"gt=0"`
	RateLimitPrefix       string            `env:"RATE_LIMIT_PREFIX" envDefault:"gateway:rl:" validate:"required"`
	RateLimitFailOpen     bool              `env:"RATE_LIMIT_FAIL_OPEN" envDefault:"false"`
}
