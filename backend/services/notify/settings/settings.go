// Package settings is the notify service's configuration, read from the environment. It is exported so tools (the
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

// Config is the notify service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config    `envPrefix:"DATABASE_"`
	Auth     authn.Config `envPrefix:"AUTH_"`
	// NATS receives the service's events; without NATS_URL they wait in notify.outbox.
	NATS   natsx.Config  `envPrefix:"NATS_"`
	Outbox outbox.Config `envPrefix:"OUTBOX_"`
	Notify Notify        `envPrefix:"NOTIFY_"`
}

// Notify holds the service's own settings.
type Notify struct {
	// SendCallers are the service identities that may queue messages.
	SendCallers []string `env:"SEND_CALLERS" envDefault:"admin,web,it" envSeparator:"," validate:"min=1,dive,required"`
	// BodyLimit caps a queued message (attachments travel base64-encoded); keep it within the gateway's 11M route
	// limit and HTTP_BODY_LIMIT.
	BodyLimit          int64 `env:"BODY_LIMIT" envDefault:"11534336" validate:"gt=0"`
	MaxAttachmentBytes int64 `env:"MAX_ATTACHMENT_BYTES" envDefault:"7864320" validate:"gt=0"`
	DefaultPageSize    int32 `env:"DEFAULT_PAGE_SIZE" envDefault:"50" validate:"gt=0,ltefield=MaxPageSize"`
	MaxPageSize        int32 `env:"MAX_PAGE_SIZE" envDefault:"200" validate:"gt=0,lte=1000"`
	// MaxAttempts is how often a transient failure is tried before the message fails (River's back-off between).
	MaxAttempts int           `env:"MAX_ATTEMPTS" envDefault:"8" validate:"gte=1,lte=25"`
	Workers     int           `env:"WORKERS" envDefault:"4" validate:"gt=0"`
	SendTimeout time.Duration `env:"SEND_TIMEOUT" envDefault:"30s" validate:"gt=0"`

	// ServiceKey signs this service's calls to the system service, which keeps the providers' credentials.
	ServiceKey string `env:"SERVICE_KEY"`
	SystemURL  string `env:"SYSTEM_URL" envDefault:"http://system:8080" validate:"url"`

	// EmailProvider is "integration" (Resend, as IT set it up) or "smtp" (EmailFrom through the SMTP server).
	EmailProvider string `env:"EMAIL_PROVIDER" envDefault:"integration" validate:"oneof=integration smtp"`
	EmailFrom     string `env:"EMAIL_FROM" envDefault:"Platform <no-reply@example.com>"`
	ResendURL     string `env:"RESEND_URL" envDefault:"https://api.resend.com" validate:"url"`
	SMTPHost      string `env:"SMTP_HOST" envDefault:"mailpit"`
	SMTPPort      int    `env:"SMTP_PORT" envDefault:"1025" validate:"gt=0,lt=65536"`
	SMTPUsername  string `env:"SMTP_USERNAME"`
	SMTPPassword  string `env:"SMTP_PASSWORD"`
	// SMTPTLS is "none", "starttls" or "tls".
	SMTPTLS string `env:"SMTP_TLS" envDefault:"starttls" validate:"oneof=none starttls tls"`

	// WhatsAppURL is the WhatsApp Cloud API with its version (the sandbox locally).
	WhatsAppURL string `env:"WHATSAPP_URL" envDefault:"https://graph.facebook.com/v21.0" validate:"url"`
	// WhatsAppCredentials is "integration" (as IT set it up) or "static" (WhatsAppPhoneID and WhatsAppToken, for the sandbox).
	WhatsAppCredentials string `env:"WHATSAPP_CREDENTIALS" envDefault:"integration" validate:"oneof=integration static"`
	WhatsAppPhoneID     string `env:"WHATSAPP_PHONE_ID"`
	WhatsAppToken       string `env:"WHATSAPP_TOKEN"`
}
