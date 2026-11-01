// Package migrate applies a service's database migrations into the service's own schema (ADR 0002): its SQL
// migrations (goose) and, when it runs background jobs, River's tables.
package migrate

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"regexp"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/database"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"
)

var schemaName = regexp.MustCompile(`^[a-z][a-z0-9_]{0,62}$`)

// Options configures Run.
type Options struct {
	Schema     string // the service's schema, e.g. "files"
	Migrations fs.FS  // goose SQL files at the root of the FS
	WithRiver  bool   // also install or upgrade River's job tables in the schema
	Logger     *slog.Logger
}

// Run creates the schema when missing and applies every pending migration. It is safe to run on each deploy and
// from several replicas: goose and River both take a lock.
func Run(ctx context.Context, pool *pgxpool.Pool, opts Options) error {
	if !schemaName.MatchString(opts.Schema) {
		return fmt.Errorf("migrate: invalid schema name %q", opts.Schema)
	}
	if _, err := pool.Exec(ctx, "CREATE SCHEMA IF NOT EXISTS "+pgx.Identifier{opts.Schema}.Sanitize()); err != nil {
		return fmt.Errorf("migrate: creating schema: %w", err)
	}

	store, err := database.NewStore(database.DialectPostgres, opts.Schema+".goose_db_version")
	if err != nil {
		return err
	}
	db := stdlib.OpenDBFromPool(pool)
	defer db.Close()
	provider, err := goose.NewProvider("", db, opts.Migrations, goose.WithStore(store))
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	results, err := provider.Up(ctx)
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	for _, r := range results {
		opts.Logger.Info("migration applied", "schema", opts.Schema, "version", r.Source.Version, "file", r.Source.Path)
	}

	if opts.WithRiver {
		migrator, err := rivermigrate.New(riverpgxv5.New(pool), &rivermigrate.Config{Schema: opts.Schema, Logger: opts.Logger})
		if err != nil {
			return fmt.Errorf("migrate: river: %w", err)
		}
		if _, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
			return fmt.Errorf("migrate: river: %w", err)
		}
	}
	return nil
}
