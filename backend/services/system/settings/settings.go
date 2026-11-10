package settings
import (
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
	Secrets		Secrets		`envPrefix:"SECRETS_"`
	System		System		`envPrefix:"SYSTEM_"`
	NATS	natsx.Config	`envPrefix:"NATS_"`
	Outbox	outbox.Config	`envPrefix:"OUTBOX_"`
}
type Secrets struct {
	Keys			[]string	`env:"KEYS" envDefault:"primary:MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=" envSeparator:"," validate:"min=1,dive,required"`
	PrimaryKeyID		string		`env:"PRIMARY_KEY_ID" envDefault:"primary" validate:"required"`
	LegacyIntegrationKey	string		`env:"LEGACY_INTEGRATION_KEY"`
}
type System struct {
	ServiceKey		string		`env:"SERVICE_KEY"`
	FilesURL		string		`env:"FILES_URL" envDefault:"http://files:8080" validate:"http_url"`
	CompanyBodyLimit	int64		`env:"COMPANY_BODY_LIMIT" envDefault:"1048576" validate:"gt=0"`
	CompanyReaders		[]string	`env:"COMPANY_READERS" envDefault:"admin,web,it,sales,finance,hr,workflow,inventory,commerce,delivery,cms" envSeparator:"," validate:"min=1,dive,required"`
	CompanyWriters	[]string	`env:"COMPANY_WRITERS" envDefault:"admin" envSeparator:"," validate:"min=1,dive,required"`
	CurrencyCallers	[]string	`env:"CURRENCY_CALLERS" envDefault:"admin,web,sales,finance,workflow,hr,inventory,commerce,delivery" envSeparator:"," validate:"min=1,dive,required"`
	SequenceCallers	[]string	`env:"SEQUENCE_CALLERS" envDefault:"admin,finance" envSeparator:"," validate:"min=1,dive,required"`
	ReadCallers	[]string	`env:"READ_CALLERS" envDefault:"admin,web,it,notify" envSeparator:"," validate:"min=1,dive,required"`
	ModuleReadCallers	[]string	`env:"MODULE_READ_CALLERS" envDefault:"identity" envSeparator:"," validate:"dive,required"`
	ModuleWriters	[]string	`env:"MODULE_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	IntegrationWriters	[]string	`env:"INTEGRATION_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	DomainWriters	[]string	`env:"DOMAIN_WRITERS" envDefault:"admin" envSeparator:"," validate:"dive,required"`
	JSONBodyLimit	int64		`env:"JSON_BODY_LIMIT" envDefault:"16384" validate:"gt=0"`
	SiteCodeBodyLimit	int64	`env:"SITE_CODE_BODY_LIMIT" envDefault:"524288" validate:"gt=0"`
}
