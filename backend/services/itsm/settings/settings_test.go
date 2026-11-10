package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/itsm/settings"
)

func TestITSMConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "itsm",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/itsm?sslmode=disable",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "itsm", cfg.ServiceName)
	assert.Equal(t, "IT Support", cfg.ITSM.ITDisplayName)
	assert.Equal(t, int32(25), cfg.ITSM.DefaultPageSize)
}
