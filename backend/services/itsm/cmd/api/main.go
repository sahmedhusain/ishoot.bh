// Command api runs the itsm service (IT tickets). Subcommands:
//
//	serve        the HTTP API (default)
//	worker       background jobs (SLA breach sweep)
//	migrate      create or upgrade the itsm schema and River's tables, then exit
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
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/itsm/internal/app"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/httpapi"
	"platform.local/backend/services/itsm/internal/jobs"
	"platform.local/backend/services/itsm/internal/postgres"
	"platform.local/backend/services/itsm/migrations"
	"platform.local/backend/services/itsm/settings"
)

// Schema is the service's database schema (ADR 0002).
const Schema = "itsm"

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "itsm:", err)
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

	svc := app.New(postgres.New(pool), app.Options{
		Limits: domain.Limits{MaxAttachments: cfg.ITSM.MaxAttachments}, ITDisplayName: cfg.ITSM.ITDisplayName, BreachBatch: cfg.ITSM.BreachBatch,
	})

	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
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
	httpapi.Register(e, svc, httpapi.Options{
		Verifier: verifier, RequestCallers: cfg.ITSM.RequestCallers, JSONBodyLimit: cfg.ITSM.JSONBodyLimit,
		DefaultPageSize: cfg.ITSM.DefaultPageSize, MaxPageSize: cfg.ITSM.MaxPageSize,
	})

	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("itsm service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}

func work(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, svc *app.Service, admin http.Handler) error {
	client, err := jobs.NewClient(pool, svc, jobs.Options{
		Schema: Schema, BreachInterval: cfg.ITSM.BreachInterval, Workers: cfg.ITSM.Workers, Logger: logger.Logger,
	})
	if err != nil {
		return err
	}
	if err := client.Start(ctx); err != nil {
		return err
	}
	logger.Info("itsm worker started")
	// The worker serves only the admin listener (probes, metrics, log level).
	_, adminServer := httpx.Servers(cfg.Common, nil, admin)
	runErr := httpx.Run(ctx, cfg.Common, logger, adminServer)
	stopCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
	defer cancel()
	return errors.Join(runErr, client.Stop(stopCtx))
}
