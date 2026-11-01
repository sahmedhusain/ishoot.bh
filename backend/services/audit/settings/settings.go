// Package settings is the audit service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
)

// Config is the audit service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config    `envPrefix:"DATABASE_"`
	Auth     authn.Config `envPrefix:"AUTH_"`
	// NATS is where the worker reads every service's events from.
	NATS  natsx.Config `envPrefix:"NATS_"`
	Audit Audit        `envPrefix:"AUDIT_"`
}

// Audit holds the service's own settings.
type Audit struct {
	DefaultPageSize int32 `env:"DEFAULT_PAGE_SIZE" envDefault:"50" validate:"gt=0,ltefield=MaxPageSize"`
	MaxPageSize     int32 `env:"MAX_PAGE_SIZE" envDefault:"200" validate:"gt=0,lte=1000"`
}
