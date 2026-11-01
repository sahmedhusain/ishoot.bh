// Command api runs the system service (installation-wide settings). Subcommands:
//
//	serve        the HTTP API (default)
//	migrate      create or upgrade the system schema, then exit
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

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/system/internal/app"
	"platform.local/backend/services/system/internal/httpapi"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/migrations"
	"platform.local/backend/services/system/settings"
)

// Schema is the service's database schema (ADR 0002).
const Schema = "system"

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "system:", err)
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

	pool, err := db.Open(ctx, cfg.Database, logger.Logger)
	if err != nil {
		return err
	}
	defer pool.Close()

	if command == "migrate" {
		return migrate.Run(ctx, pool, migrate.Options{Schema: Schema, Migrations: migrations.FS, Logger: logger.Logger})
	}

	svc := app.New(postgres.New(pool))

	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
	metrics := httpx.NewMetrics(cfg.ServiceName)
	admin := httpx.AdminHandler(cfg.Common, logger, checker, metrics)

	if command != "serve" {
		return fmt.Errorf("unknown command %q (serve, migrate, healthcheck)", command)
	}
	return serve(ctx, cfg, logger, svc, metrics, admin)
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
		Verifier: verifier, ReadCallers: cfg.System.ReadCallers, ModuleWriters: cfg.System.ModuleWriters,
		JSONBodyLimit: cfg.System.JSONBodyLimit,
	})

	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("system service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}
