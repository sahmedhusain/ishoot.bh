package settings
import (
	"time"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
)
type Config struct {
	config.Common
	Database	db.Config	`envPrefix:"DATABASE_"`
	Auth		authn.Config	`envPrefix:"AUTH_"`
	NATS	natsx.Config	`envPrefix:"NATS_"`
	Outbox	outbox.Config	`envPrefix:"OUTBOX_"`
	Notify	Notify		`envPrefix:"NOTIFY_"`
}
type Notify struct {
	SendCallers	[]string	`env:"SEND_CALLERS" envDefault:"admin,web,it" envSeparator:"," validate:"min=1,dive,required"`
	InboxCallers	[]string	`env:"INBOX_CALLERS" envDefault:"admin,web,it" envSeparator:"," validate:"min=1,dive,required"`
	InboxBodyLimit	int64	`env:"INBOX_BODY_LIMIT" envDefault:"2097152" validate:"gt=0"`
	InboxRetention	time.Duration	`env:"INBOX_RETENTION" envDefault:"8760h" validate:"gte=0"`
	InboxPurgeEvery	time.Duration	`env:"INBOX_PURGE_EVERY" envDefault:"6h" validate:"gte=0"`
	MessageRetention	time.Duration	`env:"MESSAGE_RETENTION" envDefault:"720h" validate:"gt=0"`
	MessagePurgeEvery	time.Duration	`env:"MESSAGE_PURGE_EVERY" envDefault:"24h" validate:"gt=0"`
	InboxLiveWindow	time.Duration	`env:"INBOX_LIVE_WINDOW" envDefault:"2m" validate:"gt=0"`
	BodyLimit		int64	`env:"BODY_LIMIT" envDefault:"11534336" validate:"gt=0"`
	MaxAttachmentBytes	int64	`env:"MAX_ATTACHMENT_BYTES" envDefault:"7864320" validate:"gt=0"`
	DefaultPageSize		int32	`env:"DEFAULT_PAGE_SIZE" envDefault:"50" validate:"gt=0,ltefield=MaxPageSize"`
	MaxPageSize		int32	`env:"MAX_PAGE_SIZE" envDefault:"200" validate:"gt=0,lte=1000"`
	MaxAttempts	int		`env:"MAX_ATTEMPTS" envDefault:"8" validate:"gte=1,lte=25"`
	Workers		int		`env:"WORKERS" envDefault:"4" validate:"gt=0"`
	SendTimeout	time.Duration	`env:"SEND_TIMEOUT" envDefault:"30s" validate:"gt=0"`
	ServiceKey	string	`env:"SERVICE_KEY"`
	SystemURL	string	`env:"SYSTEM_URL" envDefault:"http://system:8080" validate:"url"`
	EmailProvider	string	`env:"EMAIL_PROVIDER" envDefault:"integration" validate:"oneof=integration smtp"`
	EmailFrom	string	`env:"EMAIL_FROM" envDefault:"Platform <no-reply@example.com>"`
	ResendURL	string	`env:"RESEND_URL" envDefault:"https://api.resend.com" validate:"url"`
	SMTPHost	string	`env:"SMTP_HOST" envDefault:"mailpit"`
	SMTPPort	int	`env:"SMTP_PORT" envDefault:"1025" validate:"gt=0,lt=65536"`
	SMTPUsername	string	`env:"SMTP_USERNAME"`
	SMTPPassword	string	`env:"SMTP_PASSWORD"`
	SMTPTLS	string	`env:"SMTP_TLS" envDefault:"starttls" validate:"oneof=none starttls tls"`
	WhatsAppURL	string	`env:"WHATSAPP_URL" envDefault:"https://graph.facebook.com/v21.0" validate:"url"`
	WhatsAppCredentials	string	`env:"WHATSAPP_CREDENTIALS" envDefault:"integration" validate:"oneof=integration static"`
	WhatsAppPhoneID		string	`env:"WHATSAPP_PHONE_ID"`
	WhatsAppToken		string	`env:"WHATSAPP_TOKEN"`
}
