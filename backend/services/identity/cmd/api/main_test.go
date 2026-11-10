package main

import (
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/services/identity/settings"
)

func setupEnv(t *testing.T, serviceName string) {
	t.Helper()
	t.Setenv("SERVICE_NAME", serviceName)
	t.Setenv("ADMIN_ADDR", "127.0.0.1:59999")
	t.Setenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/test?sslmode=disable")
}

func TestHealthcheckCommand(t *testing.T) {
	setupEnv(t, "identity")
	err := run(httpx.HealthcheckCommand)
	require.Error(t, err)
}

func TestMissingConfig(t *testing.T) {
	t.Setenv("SERVICE_NAME", "")
	err := run("serve")
	require.Error(t, err)
}

func TestServiceName(t *testing.T) {
	setupEnv(t, "identity")
	var cfg settings.Config
	err := config.Load(&cfg)
	require.NoError(t, err)
	require.Equal(t, "identity", cfg.ServiceName)
}
