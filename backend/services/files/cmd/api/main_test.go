package main

import (
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/services/files/settings"
)

func setupEnv(t *testing.T, serviceName string) {
	t.Helper()
	t.Setenv("SERVICE_NAME", serviceName)
	t.Setenv("ADMIN_ADDR", "127.0.0.1:59999")
	t.Setenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/test?sslmode=disable")
	t.Setenv("S3_ENDPOINT", "http://localhost:9000")
	t.Setenv("S3_ACCESS_KEY_ID", "test")
	t.Setenv("S3_SECRET_ACCESS_KEY", "test")
}

func TestHealthcheckCommand(t *testing.T) {
	setupEnv(t, "files")
	err := run(httpx.HealthcheckCommand)
	require.Error(t, err)
}

func TestMissingConfig(t *testing.T) {
	t.Setenv("SERVICE_NAME", "")
	err := run("serve")
	require.Error(t, err)
}

func TestServiceName(t *testing.T) {
	setupEnv(t, "files")
	var cfg settings.Config
	err := config.Load(&cfg)
	require.NoError(t, err)
	require.Equal(t, "files", cfg.ServiceName)
}
