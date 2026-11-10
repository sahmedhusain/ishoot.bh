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
	Database	db.Config		`envPrefix:"DATABASE_"`
	Auth		authn.Config		`envPrefix:"AUTH_"`
	Commerce	CommerceSettings	`envPrefix:"COMMERCE_"`
	NATS		natsx.Config		`envPrefix:"NATS_"`
	ErasureKey	string		`env:"ERASURE_HASH_KEY" validate:"required,min=32"`
	Outbox		outbox.Config	`envPrefix:"OUTBOX_"`
}
type CommerceSettings struct {
	Readers	[]string	`env:"READERS" envDefault:"admin,it,web,delivery,finance" envSeparator:"," validate:"min=1,dive,required"`
	Writers	[]string	`env:"WRITERS" envDefault:"admin,web" envSeparator:"," validate:"min=1,dive,required"`
}
