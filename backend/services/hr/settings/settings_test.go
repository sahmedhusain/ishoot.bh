package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/hr/settings"
)

func TestHRConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "hr",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/hr?sslmode=disable",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "hr", cfg.ServiceName)
	assert.Contains(t, cfg.HR.Readers, "admin")
}
