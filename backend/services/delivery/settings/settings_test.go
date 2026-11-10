package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/delivery/settings"
)

func TestDeliveryConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "delivery",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/delivery?sslmode=disable",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "delivery", cfg.ServiceName)
	assert.Equal(t, "http://files:8080", cfg.Delivery.FilesURL)
	assert.Contains(t, cfg.Delivery.Readers, "admin")
}
