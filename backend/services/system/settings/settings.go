// Package settings is the system service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
)

// Config is the system service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config    `envPrefix:"DATABASE_"`
	Auth     authn.Config `envPrefix:"AUTH_"`
	Secrets  Secrets      `envPrefix:"SECRETS_"`
	System   System       `envPrefix:"SYSTEM_"`
	// NATS receives the service's events; without NATS_URL they wait in system.outbox.
	NATS   natsx.Config  `envPrefix:"NATS_"`
	Outbox outbox.Config `envPrefix:"OUTBOX_"`
}

// Secrets configures encryption for stored credentials.
type Secrets struct {
	Keys                 []string `env:"KEYS" envDefault:"primary:MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=" envSeparator:"," validate:"min=1,dive,required"`
	PrimaryKeyID         string   `env:"PRIMARY_KEY_ID" envDefault:"primary" validate:"required"`
	LegacyIntegrationKey string   `env:"LEGACY_INTEGRATION_KEY"`
}

// System holds the service's own settings.
type System struct {
	// ReadCallers are the service identities that may read settings.
	ReadCallers []string `env:"READ_CALLERS" envDefault:"admin,web,it,notify" envSeparator:"," validate:"min=1,dive,required"`
	// ModuleWriters may switch modules for a person they name (the admin's setup wizard).
	ModuleWriters []string `env:"MODULE_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	// IntegrationWriters may modify integration settings.
	IntegrationWriters []string `env:"INTEGRATION_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	// DomainWriters may set the website and admin domains for a person they name (the admin's setup wizard).
	DomainWriters []string `env:"DOMAIN_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	JSONBodyLimit int64    `env:"JSON_BODY_LIMIT" envDefault:"16384" validate:"gt=0"`
	// SiteCodeBodyLimit caps a site code change: two code documents of up to 50,000 characters each.
	SiteCodeBodyLimit int64 `env:"SITE_CODE_BODY_LIMIT" envDefault:"524288" validate:"gt=0"`
}
