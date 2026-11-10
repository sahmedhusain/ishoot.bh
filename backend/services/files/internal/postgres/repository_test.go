package postgres_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/services/files/internal/postgres"
)

func TestRepositoryInit(t *testing.T) {
	require.Equal(t, "files", postgres.Schema)
	repo := postgres.New(nil)
	require.NotNil(t, repo)
}
