// Package settings is the itsm service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
)

// Config is the itsm service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config     `envPrefix:"DATABASE_"`
	Auth     authn.Config  `envPrefix:"AUTH_"`
	NATS     natsx.Config  `envPrefix:"NATS_"`
	Outbox   outbox.Config `envPrefix:"OUTBOX_"`
	ITSM     ITSM          `envPrefix:"ITSM_"`
}

// ITSM holds the service's own settings. SLA targets are data (itsm.sla_policy), edited from the IT dashboard.
type ITSM struct {
	// RequestCallers are the service identities allowed to raise and follow tickets for employees.
	RequestCallers    []string      `env:"REQUEST_CALLERS" envDefault:"admin" envSeparator:"," validate:"min=1,dive,required"`
	ITDisplayName     string        `env:"IT_DISPLAY_NAME" envDefault:"IT Support" validate:"required,max=200"`
	MaxAttachments    int           `env:"MAX_ATTACHMENTS" envDefault:"10" validate:"gte=0,lte=50"`
	MaxAttachmentSize int64         `env:"MAX_ATTACHMENT_SIZE" envDefault:"10485760" validate:"gt=0"`
	DefaultPageSize   int32         `env:"DEFAULT_PAGE_SIZE" envDefault:"25" validate:"gt=0,ltefield=MaxPageSize"`
	MaxPageSize       int32         `env:"MAX_PAGE_SIZE" envDefault:"100" validate:"gt=0,lte=500"`
	JSONBodyLimit     int64         `env:"JSON_BODY_LIMIT" envDefault:"65536" validate:"gt=0"`
	BreachInterval    time.Duration `env:"BREACH_INTERVAL" envDefault:"1m" validate:"gt=0"`
	BreachBatch       int32         `env:"BREACH_BATCH" envDefault:"200" validate:"gt=0"`
	ReminderInterval  time.Duration `env:"REMINDER_INTERVAL" envDefault:"5m" validate:"gt=0"`
	ReminderWindow    time.Duration `env:"REMINDER_WINDOW" envDefault:"1h" validate:"gt=0"`
	ReminderBatch     int32         `env:"REMINDER_BATCH" envDefault:"200" validate:"gt=0"`
	Workers           int           `env:"WORKERS" envDefault:"1" validate:"gt=0"`

	// Inter-service notification settings
	NotifyURL  string `env:"NOTIFY_URL" envDefault:"http://notify:8080"`
	ServiceKey string `env:"SERVICE_KEY"`
}
