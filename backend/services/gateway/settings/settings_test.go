package settings_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/gateway/settings"
)

func TestGatewayConfigLoad(t *testing.T) {
	tmpFile := filepath.Join(t.TempDir(), "routes.yaml")
	require.NoError(t, os.WriteFile(tmpFile, []byte("routes: []"), 0o644))

	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME":        "gateway",
		"APP_ENV":             "test",
		"REDIS_URL":           "redis://localhost:6379",
		"GATEWAY_ROUTES_FILE": tmpFile,
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "gateway", cfg.ServiceName)
	assert.Equal(t, tmpFile, cfg.Gateway.RoutesFile)
	assert.Equal(t, "gateway:rl:", cfg.Gateway.RateLimitPrefix)
}
