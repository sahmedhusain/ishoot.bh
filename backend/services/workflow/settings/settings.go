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
	Workflow	Workflow	`envPrefix:"WORKFLOW_"`
	NATS		natsx.Config	`envPrefix:"NATS_"`
	Outbox		outbox.Config	`envPrefix:"OUTBOX_"`
}
type Workflow struct {
	Readers	[]string	`env:"READERS" envDefault:"admin,it,sales,finance,hr" envSeparator:"," validate:"min=1,dive,required"`
	Writers	[]string	`env:"WRITERS" envDefault:"admin" envSeparator:"," validate:"min=1,dive,required"`
}
