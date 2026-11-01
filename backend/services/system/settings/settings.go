// Package settings is the system service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
)

// Config is the system service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config    `envPrefix:"DATABASE_"`
	Auth     authn.Config `envPrefix:"AUTH_"`
	System   System       `envPrefix:"SYSTEM_"`
}

// System holds the service's own settings.
type System struct {
	// ReadCallers are the service identities that may read settings.
	ReadCallers []string `env:"READ_CALLERS" envDefault:"admin,web,it" envSeparator:"," validate:"min=1,dive,required"`
	// ModuleWriters may switch modules for a person they name (the admin's setup wizard).
	ModuleWriters []string `env:"MODULE_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	JSONBodyLimit int64    `env:"JSON_BODY_LIMIT" envDefault:"16384" validate:"gt=0"`
}
