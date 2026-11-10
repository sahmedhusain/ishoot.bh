package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/realtime/settings"
)

func TestRealtimeConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "realtime",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/realtime?sslmode=disable",
		"REDIS_URL":    "redis://localhost:6379",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "realtime", cfg.ServiceName)
	assert.Contains(t, cfg.Realtime.Callers, "admin")
	assert.Equal(t, 64, cfg.Realtime.Buffer)
}
