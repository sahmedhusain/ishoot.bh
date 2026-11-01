// Package db opens the PostgreSQL connection pool every service uses, with tracing, optional query logging for
// development, a server-side statement timeout and a helper for transactions.
package db

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/multitracer"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/tracelog"

	"platform.local/backend/pkg/health"
)

// Config is embedded in a service config with envPrefix:"DATABASE_".
type Config struct {
	URL               string        `env:"URL" validate:"required"`
	MaxConns          int32         `env:"MAX_CONNS" envDefault:"10" validate:"gt=0"`
	MinConns          int32         `env:"MIN_CONNS" envDefault:"0" validate:"gte=0"`
	MaxConnLifetime   time.Duration `env:"MAX_CONN_LIFETIME" envDefault:"30m" validate:"gt=0"`
	MaxConnIdleTime   time.Duration `env:"MAX_CONN_IDLE_TIME" envDefault:"5m" validate:"gt=0"`
	HealthCheckPeriod time.Duration `env:"HEALTH_CHECK_PERIOD" envDefault:"30s" validate:"gt=0"`
	StatementTimeout  time.Duration `env:"STATEMENT_TIMEOUT" envDefault:"15s" validate:"gt=0"`
	// LogQueries logs every SQL statement at debug level. For development only; arguments are never logged.
	LogQueries bool `env:"LOG_QUERIES" envDefault:"false"`
}

// Open connects and verifies the connection.
func Open(ctx context.Context, cfg Config, logger *slog.Logger) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("db: parsing DATABASE_URL: %w", err)
	}
	poolCfg.MaxConns = cfg.MaxConns
	poolCfg.MinConns = cfg.MinConns
	poolCfg.MaxConnLifetime = cfg.MaxConnLifetime
	poolCfg.MaxConnIdleTime = cfg.MaxConnIdleTime
	poolCfg.HealthCheckPeriod = cfg.HealthCheckPeriod
	poolCfg.ConnConfig.RuntimeParams["statement_timeout"] = strconv.FormatInt(cfg.StatementTimeout.Milliseconds(), 10)

	tracers := []pgx.QueryTracer{otelpgx.NewTracer()}
	if cfg.LogQueries {
		tracers = append(tracers, &tracelog.TraceLog{
			Logger:   tracelog.LoggerFunc(queryLogger(logger)),
			LogLevel: tracelog.LogLevelDebug,
		})
	}
	poolCfg.ConnConfig.Tracer = multitracer.New(tracers...)

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("db: opening pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: connecting: %w", err)
	}
	return pool, nil
}

// queryLogger keeps the SQL and timing but drops bound arguments, which may hold personal data or secrets.
func queryLogger(logger *slog.Logger) func(context.Context, tracelog.LogLevel, string, map[string]any) {
	return func(ctx context.Context, _ tracelog.LogLevel, msg string, data map[string]any) {
		attrs := []any{slog.String("pgx", msg)}
		if sql, ok := data["sql"].(string); ok {
			attrs = append(attrs, slog.String("sql", sql))
		}
		if took, ok := data["time"].(time.Duration); ok {
			attrs = append(attrs, slog.Float64("duration_ms", float64(took.Microseconds())/1000))
		}
		if err, ok := data["err"].(error); ok {
			attrs = append(attrs, slog.Any("error", err))
		}
		logger.DebugContext(ctx, "sql", attrs...)
	}
}

// Check is a readiness check for the pool.
func Check(pool *pgxpool.Pool) health.Check {
	return func(ctx context.Context) error { return pool.Ping(ctx) }
}

// Beginner starts transactions (a pool or a connection).
type Beginner interface {
	BeginTx(ctx context.Context, opts pgx.TxOptions) (pgx.Tx, error)
}

// WithTx runs fn in a transaction, committing if it returns nil and rolling back otherwise (including on panic).
func WithTx(ctx context.Context, db Beginner, opts pgx.TxOptions, fn func(pgx.Tx) error) (err error) {
	tx, err := db.BeginTx(ctx, opts)
	if err != nil {
		return fmt.Errorf("db: begin: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(context.WithoutCancel(ctx))
			panic(p)
		}
		if err != nil {
			if rbErr := tx.Rollback(context.WithoutCancel(ctx)); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
				err = errors.Join(err, rbErr)
			}
		}
	}()
	if err = fn(tx); err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("db: commit: %w", err)
	}
	return nil
}
