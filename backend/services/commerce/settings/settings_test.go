package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/commerce/settings"
)

func TestCommerceConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME":      "commerce",
		"APP_ENV":           "test",
		"DATABASE_URL":      "postgres://postgres:postgres@localhost:5432/commerce?sslmode=disable",
		"ERASURE_HASH_KEY": "12345678901234567890123456789012",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "commerce", cfg.ServiceName)
	assert.Equal(t, "12345678901234567890123456789012", cfg.ErasureKey)
	assert.Contains(t, cfg.Commerce.Readers, "admin")

	// Missing erasure key fails validation
	var invalidCfg settings.Config
	err = config.LoadFrom(&invalidCfg, map[string]string{
		"SERVICE_NAME": "commerce",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/commerce?sslmode=disable",
	})
	assert.Error(t, err)
}
