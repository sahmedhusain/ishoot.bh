// Package settings is the cms service's configuration, read from the environment.
package settings

import (
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
)

// Config is the cms service's configuration.
type Config struct {
	config.Common
	Database db.Config     `envPrefix:"DATABASE_"`
	Auth     authn.Config  `envPrefix:"AUTH_"`
	CMS      CMS           `envPrefix:"CMS_"`
	NATS     natsx.Config  `envPrefix:"NATS_"`
	Outbox   outbox.Config `envPrefix:"OUTBOX_"`
}

// CMS holds settings specific to the cms service.
type CMS struct {
	// Readers are the service identities that may read CMS content via service token.
	Readers []string `env:"READERS" envDefault:"admin,web,it" envSeparator:"," validate:"min=1,dive,required"`
	// Writers are the service identities that may modify CMS content via service token.
	Writers []string `env:"WRITERS" envDefault:"admin" envSeparator:"," validate:"min=1,dive,required"`
}
