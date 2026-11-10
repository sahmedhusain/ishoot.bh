package settings
import (
	"time"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/redisx"
)
type Config struct {
	config.Common
	Redis	redisx.Config	`envPrefix:"REDIS_"`
	Gateway	Gateway		`envPrefix:"GATEWAY_"`
	Auth	authn.Config	`envPrefix:"AUTH_"`
}
type Gateway struct {
	RoutesFile	string	`env:"ROUTES_FILE" validate:"required,file"`
	Upstreams		map[string]string	`env:"UPSTREAMS" envSeparator:"," envKeyValSeparator:"=" validate:"dive,url"`
	DialTimeout		time.Duration		`env:"UPSTREAM_DIAL_TIMEOUT" envDefault:"3s" validate:"gt=0"`
	ResponseHeaderTimeout	time.Duration		`env:"UPSTREAM_RESPONSE_TIMEOUT" envDefault:"20s" validate:"gt=0"`
	IdleConnTimeout		time.Duration		`env:"UPSTREAM_IDLE_TIMEOUT" envDefault:"90s" validate:"gt=0"`
	MaxIdleConnsPerHost	int			`env:"UPSTREAM_MAX_IDLE_CONNS_PER_HOST" envDefault:"64" validate:"gt=0"`
	IdentityStatusURL	string			`env:"IDENTITY_STATUS_URL" validate:"omitempty,url"`
	IdentityStatusTimeout	time.Duration		`env:"IDENTITY_STATUS_TIMEOUT" envDefault:"3s" validate:"gt=0"`
	RateLimitPrefix		string			`env:"RATE_LIMIT_PREFIX" envDefault:"gateway:rl:" validate:"required"`
	RateLimitFailOpen	bool			`env:"RATE_LIMIT_FAIL_OPEN" envDefault:"false"`
}
