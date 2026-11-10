package settings
import (
	"time"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/redisx"
)
type Config struct {
	config.Common
	Database	db.Config	`envPrefix:"DATABASE_"`
	Auth		authn.Config	`envPrefix:"AUTH_"`
	NATS	natsx.Config	`envPrefix:"NATS_"`
	Redis		redisx.Config	`envPrefix:"REDIS_"`
	Realtime	Realtime	`envPrefix:"REALTIME_"`
}
type Realtime struct {
	Callers	[]string	`env:"CALLERS" envDefault:"admin,it" envSeparator:"," validate:"min=1,dive,required"`
	Heartbeat	time.Duration	`env:"HEARTBEAT" envDefault:"20s" validate:"gt=0"`
	MaxStreamAge	time.Duration	`env:"MAX_STREAM_AGE" envDefault:"30m" validate:"gt=0"`
	Retry	time.Duration	`env:"RETRY" envDefault:"3s" validate:"gt=0"`
	Buffer	int	`env:"BUFFER" envDefault:"64" validate:"gt=0,lte=4096"`
	MaxStreamsPerUser	int	`env:"MAX_STREAMS_PER_USER" envDefault:"20" validate:"gt=0"`
	MaxTopics	int	`env:"MAX_TOPICS" envDefault:"64" validate:"gt=0,lte=256"`
	PresenceTTL	time.Duration	`env:"PRESENCE_TTL" envDefault:"60s" validate:"gt=0"`
	IdleTTL	time.Duration	`env:"IDLE_TTL" envDefault:"15m" validate:"gt=0"`
	Tick	time.Duration	`env:"TICK" envDefault:"30s" validate:"gt=0"`
	Retention	time.Duration	`env:"RETENTION" envDefault:"720h" validate:"gt=0"`
	MaxPresenceIDs	int	`env:"MAX_PRESENCE_IDS" envDefault:"200" validate:"gt=0,lte=1000"`
	MaxSyncWindows	int	`env:"MAX_SYNC_WINDOWS" envDefault:"5000" validate:"gt=0"`
}
