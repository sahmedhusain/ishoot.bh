package settings
import (
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
)
type Config struct {
	config.Common
	Database	db.Config	`envPrefix:"DATABASE_"`
	Auth		authn.Config	`envPrefix:"AUTH_"`
	NATS	natsx.Config	`envPrefix:"NATS_"`
	Audit	Audit		`envPrefix:"AUDIT_"`
}
type Audit struct {
	DefaultPageSize	int32	`env:"DEFAULT_PAGE_SIZE" envDefault:"50" validate:"gt=0,ltefield=MaxPageSize"`
	MaxPageSize	int32	`env:"MAX_PAGE_SIZE" envDefault:"200" validate:"gt=0,lte=1000"`
}
