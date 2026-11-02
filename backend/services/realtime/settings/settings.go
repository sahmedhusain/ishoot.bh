// Package settings is the realtime service's configuration, read from the environment. It is exported so tools (the
// configuration reference generator) can read it; the rest of the service is internal.
package settings

import (
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/redisx"
)

// Config is the realtime service's configuration (see docs/backend/CONFIG.md).
type Config struct {
	config.Common
	Database db.Config    `envPrefix:"DATABASE_"`
	Auth     authn.Config `envPrefix:"AUTH_"`
	// NATS carries the hints every replica writes to its connections (required).
	NATS natsx.Config `envPrefix:"NATS_"`
	// Redis (Valkey) holds who is connected and who is idle, shared by every replica.
	Redis    redisx.Config `envPrefix:"REDIS_"`
	Realtime Realtime      `envPrefix:"REALTIME_"`
}

// Realtime holds the service's own settings.
type Realtime struct {
	// Callers are the service identities that may open streams for their signed-in people, publish hints and set
	// statuses and status windows.
	Callers []string `env:"CALLERS" envDefault:"admin,it" envSeparator:"," validate:"min=1,dive,required"`
	// Heartbeat is how often an idle stream sends a comment, so proxies keep it open and dead clients are noticed.
	Heartbeat time.Duration `env:"HEARTBEAT" envDefault:"20s" validate:"gt=0"`
	// MaxStreamAge closes a stream after this long; the browser reconnects at once, which checks the person again.
	MaxStreamAge time.Duration `env:"MAX_STREAM_AGE" envDefault:"30m" validate:"gt=0"`
	// Retry is how long browsers wait before reconnecting after a drop (the SSE retry field).
	Retry time.Duration `env:"RETRY" envDefault:"3s" validate:"gt=0"`
	// Buffer is how many hints may wait for one slow connection before it is closed.
	Buffer int `env:"BUFFER" envDefault:"64" validate:"gt=0,lte=4096"`
	// MaxStreamsPerUser caps one person's open streams on one replica (tabs share one per browser).
	MaxStreamsPerUser int `env:"MAX_STREAMS_PER_USER" envDefault:"20" validate:"gt=0"`
	// MaxTopics caps the topics one stream may follow.
	MaxTopics int `env:"MAX_TOPICS" envDefault:"64" validate:"gt=0,lte=256"`
	// PresenceTTL is how long a replica's mark that someone is connected lasts without being renewed.
	PresenceTTL time.Duration `env:"PRESENCE_TTL" envDefault:"60s" validate:"gt=0"`
	// IdleTTL is how long an "idle" report lasts unless renewed (browsers renew it while idle).
	IdleTTL time.Duration `env:"IDLE_TTL" envDefault:"15m" validate:"gt=0"`
	// Tick is how often statuses that start or end (meetings, leave, expiring choices) are announced.
	Tick time.Duration `env:"TICK" envDefault:"30s" validate:"gt=0"`
	// Retention is how long ended windows are kept.
	Retention time.Duration `env:"RETENTION" envDefault:"720h" validate:"gt=0"`
	// MaxPresenceIDs caps one presence lookup.
	MaxPresenceIDs int `env:"MAX_PRESENCE_IDS" envDefault:"200" validate:"gt=0,lte=1000"`
	// MaxSyncWindows caps one window sync.
	MaxSyncWindows int `env:"MAX_SYNC_WINDOWS" envDefault:"5000" validate:"gt=0"`
}
