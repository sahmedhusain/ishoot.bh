package main

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/services/gateway/settings"
)

func setupEnv(t *testing.T, serviceName string) {
	t.Helper()
	routesFile := t.TempDir() + "/routes.json"
	require.NoError(t, os.WriteFile(routesFile, []byte("[]"), 0644))

	t.Setenv("SERVICE_NAME", serviceName)
	t.Setenv("ADMIN_ADDR", "127.0.0.1:59999")
	t.Setenv("REDIS_URL", "redis://localhost:6379")
	t.Setenv("GATEWAY_ROUTES_FILE", routesFile)
}

func TestHealthcheckCommand(t *testing.T) {
	setupEnv(t, "gateway")
	origArgs := os.Args
	t.Cleanup(func() { os.Args = origArgs })
	os.Args = []string{"gateway", httpx.HealthcheckCommand}
	err := run()
	require.Error(t, err)
}

func TestMissingConfig(t *testing.T) {
	t.Setenv("SERVICE_NAME", "")
	err := run()
	require.Error(t, err)
}

func TestServiceName(t *testing.T) {
	setupEnv(t, "gateway")
	var cfg settings.Config
	err := config.Load(&cfg)
	require.NoError(t, err)
	require.Equal(t, "gateway", cfg.ServiceName)
}

// `./run.sh db migrate` runs every service binary with the migrate command, so
// the gateway must accept it without any gateway-only config (REDIS_URL,
// GATEWAY_ROUTES_FILE) and without a DB connection - it owns no schema.
func TestMigrateCommandNeedsNoGatewayConfig(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DATABASE_DIRECT_URL", "")
	origArgs := os.Args
	t.Cleanup(func() { os.Args = origArgs })
	os.Args = []string{"gateway", migrateCommand}
	require.NoError(t, run())
}
