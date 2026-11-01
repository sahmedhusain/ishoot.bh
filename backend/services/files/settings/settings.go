// Package settings is the files service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/objectstore"
)

// Config is the files service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config          `envPrefix:"DATABASE_"`
	S3       objectstore.Config `envPrefix:"S3_"`
	Auth     authn.Config       `envPrefix:"AUTH_"`
	Files    Files              `envPrefix:"FILES_"`
}

// Files holds the service's own settings.
type Files struct {
	PublicBucket  string `env:"PUBLIC_BUCKET" envDefault:"public-assets" validate:"required"`
	PrivateBucket string `env:"PRIVATE_BUCKET" envDefault:"private-assets" validate:"required,nefield=PublicBucket"`
	// CreateBuckets creates missing buckets at start-up (development, CI and first installation).
	CreateBuckets   bool          `env:"CREATE_BUCKETS" envDefault:"false"`
	MaxFileSize     int64         `env:"MAX_FILE_SIZE" envDefault:"10485760" validate:"gt=0"`
	UploadTTL       time.Duration `env:"UPLOAD_TTL" envDefault:"24h" validate:"gt=0"`
	LookupLimit     int           `env:"LOOKUP_LIMIT" envDefault:"100" validate:"gt=0,lte=1000"`
	JSONBodyLimit   int64         `env:"JSON_BODY_LIMIT" envDefault:"65536" validate:"gt=0"`
	CleanupInterval time.Duration `env:"CLEANUP_INTERVAL" envDefault:"5m" validate:"gt=0"`
	CleanupBatch    int32         `env:"CLEANUP_BATCH" envDefault:"100" validate:"gt=0"`
	CleanupWorkers  int           `env:"CLEANUP_WORKERS" envDefault:"1" validate:"gt=0"`
}
