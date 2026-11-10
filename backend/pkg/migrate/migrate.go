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
type Options struct {
	Schema		string
	Migrations	fs.FS
	WithRiver	bool
	Logger		*slog.Logger
}
func Run(ctx context.Context, pool *pgxpool.Pool, opts Options) error {
	if !schemaName.MatchString(opts.Schema) {
		return fmt.Errorf("migrate: invalid schema name %q", opts.Schema)
	}
	var exists bool
	if err := pool.QueryRow(ctx, "SELECT to_regnamespace($1) IS NOT NULL", opts.Schema).Scan(&exists); err != nil {
		return fmt.Errorf("migrate: checking schema: %w", err)
	}
	if !exists {
		if _, err := pool.Exec(ctx, "CREATE SCHEMA IF NOT EXISTS "+pgx.Identifier{opts.Schema}.Sanitize()); err != nil {
			return fmt.Errorf("migrate: creating schema: %w", err)
		}
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
