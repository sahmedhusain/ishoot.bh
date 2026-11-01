// Package settings is the gateway's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"fmt"
	"time"

	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/redisx"
)

// Config is the gateway's configuration. Every value comes from the environment (see README.md).
type Config struct {
	config.Common
	Redis   redisx.Config `envPrefix:"REDIS_"`
	Gateway Gateway       `envPrefix:"GATEWAY_"`
	Auth    Auth          `envPrefix:"AUTH_"`
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

// Auth configures token verification. Required as soon as one route is not public.
type Auth struct {
	Issuer         string        `env:"ISSUER"`
	JWKSURL        string        `env:"JWKS_URL" validate:"omitempty,url"`
	JWKSTTL        time.Duration `env:"JWKS_TTL" envDefault:"10m" validate:"gt=0"`
	JWKSMinRefresh time.Duration `env:"JWKS_MIN_REFRESH" envDefault:"30s" validate:"gt=0"`
	ClockSkew      time.Duration `env:"CLOCK_SKEW" envDefault:"30s" validate:"gte=0"`
	FetchTimeout   time.Duration `env:"JWKS_FETCH_TIMEOUT" envDefault:"5s" validate:"gt=0"`
}

// ValidateFor checks that token settings are present when a route needs a token.
func (a Auth) ValidateFor(needed bool) error {
	if needed && (a.Issuer == "" || a.JWKSURL == "") {
		return fmt.Errorf("config: AUTH_ISSUER and AUTH_JWKS_URL are required when a route needs a token")
	}
	return nil
}
