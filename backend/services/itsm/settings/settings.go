// Package settings is the itsm service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
)

// Config is the itsm service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config    `envPrefix:"DATABASE_"`
	Auth     authn.Config `envPrefix:"AUTH_"`
	ITSM     ITSM         `envPrefix:"ITSM_"`
}

// ITSM holds the service's own settings. SLA targets are data (itsm.sla_policy), edited from the IT dashboard.
type ITSM struct {
	// RequestCallers are the service identities allowed to raise and follow tickets for employees.
	RequestCallers  []string      `env:"REQUEST_CALLERS" envDefault:"admin" envSeparator:"," validate:"min=1,dive,required"`
	ITDisplayName   string        `env:"IT_DISPLAY_NAME" envDefault:"IT Support" validate:"required,max=200"`
	MaxAttachments  int           `env:"MAX_ATTACHMENTS" envDefault:"10" validate:"gte=0,lte=50"`
	DefaultPageSize int32         `env:"DEFAULT_PAGE_SIZE" envDefault:"25" validate:"gt=0,ltefield=MaxPageSize"`
	MaxPageSize     int32         `env:"MAX_PAGE_SIZE" envDefault:"100" validate:"gt=0,lte=500"`
	JSONBodyLimit   int64         `env:"JSON_BODY_LIMIT" envDefault:"65536" validate:"gt=0"`
	BreachInterval  time.Duration `env:"BREACH_INTERVAL" envDefault:"1m" validate:"gt=0"`
	BreachBatch     int32         `env:"BREACH_BATCH" envDefault:"200" validate:"gt=0"`
	Workers         int           `env:"WORKERS" envDefault:"1" validate:"gt=0"`
}
