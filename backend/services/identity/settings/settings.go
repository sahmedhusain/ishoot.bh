// Package settings defines identity's static environment configuration.
package settings

import (
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/tokens"
)

type Config struct {
	config.Common
	Database db.Config     `envPrefix:"DATABASE_"`
	Auth     authn.Config  `envPrefix:"AUTH_"`
	Signing  tokens.Config `envPrefix:"IDENTITY_"`
	Session  Session       `envPrefix:"IDENTITY_"`
	Login    Login         `envPrefix:"IDENTITY_LOGIN_"`
}

type Session struct {
	TTL             time.Duration `env:"SESSION_TTL" envDefault:"168h" validate:"gt=0"`
	CleanupInterval time.Duration `env:"CLEANUP_INTERVAL" envDefault:"5m" validate:"gt=0"`
	CleanupBatch    int32         `env:"CLEANUP_BATCH" envDefault:"100" validate:"gt=0"`
	CleanupWorkers  int           `env:"CLEANUP_WORKERS" envDefault:"1" validate:"gt=0"`
	JSONBodyLimit   int64         `env:"JSON_BODY_LIMIT" envDefault:"65536" validate:"gt=0"`
}

// Login is opt-in until account migration and frontend parity are ready.
type Login struct {
	Enabled          bool            `env:"ENABLED" envDefault:"false"`
	RedisURL         string          `env:"REDIS_URL" validate:"omitempty,url"`
	RateKey          string          `env:"RATE_KEY"`
	AccountAttempts  int             `env:"ACCOUNT_ATTEMPTS" envDefault:"10" validate:"gt=0"`
	IPAttempts       int             `env:"IP_ATTEMPTS" envDefault:"60" validate:"gt=0"`
	RateWindow       time.Duration   `env:"RATE_WINDOW" envDefault:"1m" validate:"gt=0"`
	MaxConcurrentKDF int             `env:"MAX_CONCURRENT_KDF" envDefault:"2" validate:"gt=0,lte=64"`
	ITAllowedCIDRs   []string        `env:"IT_ALLOWED_CIDRS" envSeparator:"," validate:"dive,cidr"`
	MFAKeys          []string        `env:"MFA_KEYS" envSeparator:","`
	MFAPrimaryID     string          `env:"MFA_PRIMARY_ID"`
	MFALegacyKey     string          `env:"MFA_LEGACY_KEY"`
	Password         password.Config `envPrefix:"PASSWORD_"`
	TOTP             totp.Config     `envPrefix:"TOTP_"`
}
