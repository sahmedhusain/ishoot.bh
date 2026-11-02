// Command api runs the files service. Subcommands:
//
//	serve        the HTTP API (default)
//	worker       background jobs (expired-upload cleanup)
//	migrate      create or upgrade the files schema and River's tables, then exit
//	healthcheck  probe this container's readiness (Docker HEALTHCHECK)
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/files/internal/app"
	"platform.local/backend/services/files/internal/httpapi"
	"platform.local/backend/services/files/internal/jobs"
	"platform.local/backend/services/files/internal/postgres"
	"platform.local/backend/services/files/internal/remote"
	"platform.local/backend/services/files/migrations"
	"platform.local/backend/services/files/settings"
)

// Schema is the service's database schema (ADR 0002).
const Schema = "files"

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "files:", err)
		os.Exit(1)
	}
}

func run(command string) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var cfg settings.Config
	if err := config.Load(&cfg); err != nil {
		return err
	}
	if command == httpx.HealthcheckCommand {
		return httpx.Probe(ctx, cfg.Admin.Addr, cfg.Admin.ReadinessTimeout)
	}
	logger := logx.New(os.Stdout, logx.Options{
		Level: cfg.Log.Level, Format: cfg.Log.Format, Service: cfg.ServiceName, Version: cfg.Version, Env: cfg.AppEnv,
	})
	shutdownTracing, err := telemetry.Setup(ctx, cfg.Common)
	if err != nil {
		return err
	}
	defer func() { _ = shutdownTracing(context.WithoutCancel(ctx)) }()

	dbCfg := cfg.Database
	if command == "migrate" || command == "worker" {
		dbCfg = dbCfg.Session() // past the pooler: they need a whole session
	}
	pool, err := db.Open(ctx, dbCfg, logger.Logger)
	if err != nil {
		return err
	}
	defer pool.Close()

	if command == "migrate" {
		return migrate.Run(ctx, pool, migrate.Options{Schema: Schema, Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger})
	}

	store := objectstore.New(cfg.S3)
	if cfg.Files.CreateBuckets {
		for _, bucket := range []string{cfg.Files.PublicBucket, cfg.Files.PrivateBucket} {
			if err := store.EnsureBucket(ctx, bucket); err != nil {
				return err
			}
		}
	}
	svc := app.New(postgres.New(pool), store, app.Options{
		PublicBucket: cfg.Files.PublicBucket, PrivateBucket: cfg.Files.PrivateBucket, MaxFileSize: cfg.Files.MaxFileSize,
		UploadTTL: cfg.Files.UploadTTL, LookupLimit: cfg.Files.LookupLimit, CleanupBatch: cfg.Files.CleanupBatch,
	})
	svc.SetImporter(remote.New(cfg.Files.ImportTimeout, min(cfg.Files.ImportMaxSize, cfg.Files.MaxFileSize), cfg.Files.ImportAllowPrivate))

	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
	checker.Register("s3", store.Check(cfg.Files.PrivateBucket))
	metrics := httpx.NewMetrics(cfg.ServiceName)
	admin := httpx.AdminHandler(cfg.Common, logger, checker, metrics)

	switch command {
	case "serve":
		return serve(ctx, cfg, logger, svc, metrics, admin)
	case "worker":
		return work(ctx, cfg, logger, pool, svc, admin)
	}
	return fmt.Errorf("unknown command %q (serve, worker, migrate, healthcheck)", command)
}

func serve(ctx context.Context, cfg settings.Config, logger *logx.Logger, svc *app.Service, metrics *httpx.Metrics, admin http.Handler) error {
	if !cfg.Auth.Configured() {
		return errors.New("set AUTH_SERVICE_KEYS_FILE (and AUTH_ISSUER/AUTH_JWKS_URL once identity runs)")
	}
	verifier, err := authn.NewVerifierFromConfig(cfg.Auth)
	if err != nil {
		return err
	}
	// Middleware uses each incoming request's context, not the process shutdown context.
	e, err := httpx.New(cfg.Common, logger, metrics) //nolint:contextcheck // Request contexts are supplied by Echo at request time.
	if err != nil {
		return err
	}
	e.Use(telemetry.EchoMiddleware())
	httpapi.Register(e.Group("/v1/files", authn.Require(verifier, authn.RealmService)), svc, cfg.Files.JSONBodyLimit) //nolint:contextcheck // Authentication must use the incoming request's context.

	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("files service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}

func work(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, svc *app.Service, admin http.Handler) error {
	client, err := jobs.NewClient(pool, svc, jobs.Options{
		Schema: Schema, CleanupInterval: cfg.Files.CleanupInterval, Workers: cfg.Files.CleanupWorkers, Logger: logger.Logger,
	})
	if err != nil {
		return err
	}
	if err := client.Start(ctx); err != nil {
		return err
	}
	logger.Info("files worker started")
	// The worker serves only the admin listener (probes, metrics, log level).
	_, adminServer := httpx.Servers(cfg.Common, nil, admin)
	runErr := httpx.Run(ctx, cfg.Common, logger, adminServer)
	stopCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
	defer cancel()
	return errors.Join(runErr, client.Stop(stopCtx))
}
