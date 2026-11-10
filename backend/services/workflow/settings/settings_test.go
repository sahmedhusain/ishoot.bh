package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/workflow/settings"
)

func TestWorkflowConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME": "workflow",
		"APP_ENV":      "test",
		"DATABASE_URL": "postgres://postgres:postgres@localhost:5432/workflow?sslmode=disable",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "workflow", cfg.ServiceName)
	assert.Contains(t, cfg.Workflow.Readers, "admin")
}
