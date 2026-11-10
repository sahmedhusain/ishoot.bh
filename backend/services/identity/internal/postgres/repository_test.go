package postgres_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/services/identity/internal/postgres"
)

func TestRepositoryInit(t *testing.T) {
	require.Equal(t, "identity", postgres.Schema)
	repo := postgres.New(nil)
	require.NotNil(t, repo)
}
