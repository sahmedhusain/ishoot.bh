package migrations_test

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/outbox"
)

// The service's outbox migration is the shared DDL, so the relay and Enqueue find the columns they expect.
func TestOutboxMigrationMatchesDDL(t *testing.T) {
	raw, err := os.ReadFile("00004_outbox.sql")
	require.NoError(t, err)
	up := strings.SplitN(strings.SplitN(string(raw), "-- +goose Up", 2)[1], "-- +goose Down", 2)[0]
	require.Equal(t, strings.TrimSpace(outbox.DDL("system")), strings.TrimSpace(up))
}
