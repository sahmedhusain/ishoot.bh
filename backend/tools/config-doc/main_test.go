package main
import (
	"bytes"
	"os"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestDocumentIsCurrent(t *testing.T) {
	var buf bytes.Buffer
	write(&buf)
	stored, err := os.ReadFile("../../../docs/backend/CONFIG.md")
	require.NoError(t, err, "run: make gen")
	assert.Equal(t, buf.String(), string(stored), "docs/backend/CONFIG.md is stale; run: make gen")
	assert.Contains(t, buf.String(), "`GATEWAY_ROUTES_FILE`")
	assert.Contains(t, buf.String(), "`HTTP_BODY_LIMIT`")
}
