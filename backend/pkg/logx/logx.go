// Package logx builds the structured logger every service uses: JSON (or text in development) on stdout, a level
// that can change while the service runs, request-scoped fields carried in the context, and redaction of secrets.
package logx

import (
	"context"
	"io"
	"log/slog"
	"strings"
)

// Logger wraps slog.Logger with the level variable that controls it, so the level can change at runtime.
type Logger struct {
	*slog.Logger
	level *slog.LevelVar
}

// Options configures New.
type Options struct {
	Level   string // debug, info, warn or error
	Format  string // json or text
	Service string
	Version string
	Env     string
}

// New returns a logger writing to w.
func New(w io.Writer, opts Options) *Logger {
	level := new(slog.LevelVar)
	level.Set(ParseLevel(opts.Level))
	handlerOpts := &slog.HandlerOptions{Level: level, ReplaceAttr: redact}
	var handler slog.Handler
	if opts.Format == "text" {
		handler = slog.NewTextHandler(w, handlerOpts)
	} else {
		handler = slog.NewJSONHandler(w, handlerOpts)
	}
	logger := slog.New(contextHandler{handler}).With(
		slog.String("service", opts.Service),
		slog.String("version", opts.Version),
		slog.String("env", opts.Env),
	)
	return &Logger{Logger: logger, level: level}
}

// SetLevel changes the minimum level while the service runs.
func (l *Logger) SetLevel(name string) { l.level.Set(ParseLevel(name)) }

// Level returns the current minimum level.
func (l *Logger) Level() slog.Level { return l.level.Level() }

// ParseLevel maps a level name to a slog level; unknown names mean info.
func ParseLevel(name string) slog.Level {
	switch strings.ToLower(name) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

type ctxKey struct{}

// WithAttrs returns a context whose log records carry attrs (request ID, user ID…) in addition to any already set.
func WithAttrs(ctx context.Context, attrs ...slog.Attr) context.Context {
	existing, _ := ctx.Value(ctxKey{}).([]slog.Attr)
	merged := make([]slog.Attr, 0, len(existing)+len(attrs))
	merged = append(merged, existing...)
	merged = append(merged, attrs...)
	return context.WithValue(ctx, ctxKey{}, merged)
}

// contextHandler adds the attributes stored by WithAttrs to every record logged with a context.
type contextHandler struct{ slog.Handler }

func (h contextHandler) Handle(ctx context.Context, record slog.Record) error {
	if attrs, ok := ctx.Value(ctxKey{}).([]slog.Attr); ok {
		record.AddAttrs(attrs...)
	}
	return h.Handler.Handle(ctx, record)
}

func (h contextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return contextHandler{h.Handler.WithAttrs(attrs)}
}

func (h contextHandler) WithGroup(name string) slog.Handler {
	return contextHandler{h.Handler.WithGroup(name)}
}

// RedactedValue replaces the value of any attribute whose key looks secret.
const RedactedValue = "[REDACTED]"

var secretKeyParts = []string{"password", "passwd", "secret", "token", "authorization", "cookie", "api_key", "apikey", "private_key", "otp", "credential"}

// IsSecretKey reports whether an attribute or header name should never be logged in clear.
func IsSecretKey(key string) bool {
	lower := strings.ToLower(key)
	for _, part := range secretKeyParts {
		if strings.Contains(lower, part) {
			return true
		}
	}
	return false
}

func redact(_ []string, attr slog.Attr) slog.Attr {
	if attr.Value.Kind() != slog.KindGroup && IsSecretKey(attr.Key) {
		return slog.String(attr.Key, RedactedValue)
	}
	return attr
}
