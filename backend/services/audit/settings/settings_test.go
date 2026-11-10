package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/audit/settings"
)

func TestAuditConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "audit",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/audit?sslmode=disable",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "audit", cfg.ServiceName)
	assert.Equal(t, int32(50), cfg.Audit.DefaultPageSize)
	assert.Equal(t, int32(200), cfg.Audit.MaxPageSize)
}
