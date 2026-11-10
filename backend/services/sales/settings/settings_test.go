package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/sales/settings"
)

func TestSalesConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME":      "sales",
		"APP_ENV":           "test",
		"DATABASE_URL":      "postgres://postgres:postgres@localhost:5432/sales?sslmode=disable",
		"ERASURE_HASH_KEY": "12345678901234567890123456789012",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "sales", cfg.ServiceName)
	assert.Equal(t, "12345678901234567890123456789012", cfg.ErasureKey)
	assert.Contains(t, cfg.Sales.Readers, "admin")
}
