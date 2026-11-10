package logx
import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func decode(t *testing.T, buf *bytes.Buffer) map[string]any {
	t.Helper()
	var record map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &record))
	return record
}
func TestLoggerAddsServiceAndContextFields(t *testing.T) {
	var buf bytes.Buffer
	logger := New(&buf, Options{Level: "info", Service: "gateway", Version: "1.2.3", Env: "test"})
	ctx := WithAttrs(context.Background(), slog.String("request_id", "abc"))
	ctx = WithAttrs(ctx, slog.String("user_id", "u1"))
	logger.InfoContext(ctx, "hello")
	record := decode(t, &buf)
	assert.Equal(t, "gateway", record["service"])
	assert.Equal(t, "1.2.3", record["version"])
	assert.Equal(t, "abc", record["request_id"])
	assert.Equal(t, "u1", record["user_id"])
}
func TestLoggerRedactsSecrets(t *testing.T) {
	var buf bytes.Buffer
	logger := New(&buf, Options{Level: "info"})
	logger.Info("login", slog.String("password", "hunter2"), slog.String("Authorization", "Bearer x"), slog.String("email", "a@b.c"))
	record := decode(t, &buf)
	assert.Equal(t, RedactedValue, record["password"])
	assert.Equal(t, RedactedValue, record["Authorization"])
	assert.Equal(t, "a@b.c", record["email"])
}
func TestSetLevelChangesOutputAtRuntime(t *testing.T) {
	var buf bytes.Buffer
	logger := New(&buf, Options{Level: "warn"})
	logger.Info("hidden")
	assert.Zero(t, buf.Len())
	logger.SetLevel("debug")
	assert.Equal(t, slog.LevelDebug, logger.Level())
	logger.Debug("shown")
	assert.NotZero(t, buf.Len())
}
func TestParseLevel(t *testing.T) {
	assert.Equal(t, slog.LevelWarn, ParseLevel("WARNING"))
	assert.Equal(t, slog.LevelError, ParseLevel("error"))
	assert.Equal(t, slog.LevelInfo, ParseLevel("unknown"))
}
