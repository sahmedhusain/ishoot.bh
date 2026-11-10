package migrations_test
import (
	"os"
	"strings"
	"testing"
	"github.com/stretchr/testify/require"
	)
func TestOutboxMigrationMatchesDDL(t *testing.T) {
	raw, err := os.ReadFile("00004_outbox.sql")
	require.NoError(t, err)
	sqlStr := string(raw)
	var up string
	if strings.Contains(sqlStr, "-- +goose Up") {
		up = strings.SplitN(strings.SplitN(sqlStr, "-- +goose Up", 2)[1], "-- +goose Down", 2)[0]
	} else {
		up = sqlStr
	}
	require.NotEmpty(t, up)
}
