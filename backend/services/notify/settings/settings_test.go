package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/notify/settings"
)

func TestNotifyConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "notify",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/notify?sslmode=disable",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "notify", cfg.ServiceName)
	assert.Equal(t, "integration", cfg.Notify.EmailProvider)
	assert.Equal(t, int32(50), cfg.Notify.DefaultPageSize)
}
