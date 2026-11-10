package settings_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/config"
	"platform.local/backend/services/files/settings"
)

func TestFilesConfigLoad(t *testing.T) {
	var cfg settings.Config
	env := map[string]string{
		"SERVICE_NAME":          "files",
		"APP_ENV":               "test",
		"DATABASE_URL":          "postgres://postgres:postgres@localhost:5432/files?sslmode=disable",
		"S3_ENDPOINT":           "http://localhost:9000",
		"S3_ACCESS_KEY_ID":      "minio",
		"S3_SECRET_ACCESS_KEY":  "minio123",
	}

	err := config.LoadFrom(&cfg, env)
	require.NoError(t, err)
	assert.Equal(t, "files", cfg.ServiceName)
	assert.Equal(t, "public-assets", cfg.Files.PublicBucket)
	assert.Equal(t, "private-assets", cfg.Files.PrivateBucket)
}
