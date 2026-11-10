package postgres_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/services/notify/internal/postgres"
)

func TestRepositoryInit(t *testing.T) {
	require.Equal(t, "notify", postgres.Schema)
	store := postgres.New(nil)
	require.NotNil(t, store)
}
