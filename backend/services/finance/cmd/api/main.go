// Command api runs the finance service. Subcommands:
//
//	serve        the HTTP API (default)
//	migrate      create or upgrade the finance schema, then exit
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
	"github.com/prometheus/client_golang/prometheus"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/finance/internal/app"
	"platform.local/backend/services/finance/internal/httpapi"
	"platform.local/backend/services/finance/internal/postgres"
	"platform.local/backend/services/finance/migrations"
	"platform.local/backend/services/finance/settings"
)

const Schema = "finance"

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "finance:", err)
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
		dbCfg = dbCfg.Session()
	}
	pool, err := db.Open(ctx, dbCfg, logger.Logger)
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
	return serve(ctx, cfg, logger, pool, svc, metrics, admin)
}

func serve(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, svc *app.Service, metrics *httpx.Metrics, admin http.Handler) error {
	if !cfg.Auth.Configured() {
		return errors.New("set AUTH_SERVICE_KEYS_FILE (and AUTH_ISSUER/AUTH_JWKS_URL once identity runs)")
	}
	verifier, err := authn.NewVerifierFromConfig(cfg.Auth)
	if err != nil {
		return err
	}
	e, err := httpx.New(cfg.Common, logger, metrics) //nolint:contextcheck // Request contexts are supplied by Echo at request time.
	if err != nil {
		return err
	}
	e.Use(telemetry.EchoMiddleware())
	httpapi.Register(e, svc, httpapi.Options{
		Verifier: verifier,
		Readers:  cfg.Finance.Readers,
		Writers:  cfg.Finance.Writers,
	})

	relayDone, err := startRelay(ctx, cfg, logger, pool, metrics.Registry)
	if err != nil {
		return err
	}
	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("finance service starting")
	runErr := httpx.Run(ctx, cfg.Common, logger, public, adminServer)
	<-relayDone
	return runErr
}

func startRelay(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, registry prometheus.Registerer) (<-chan struct{}, error) {
	done := make(chan struct{})
	if !cfg.NATS.Configured() {
		logger.Warn("NATS_URL is not set: events stay in finance.outbox until a relay publishes them")
		close(done)
		return done, nil
	}
	client, err := natsx.Connect(ctx, cfg.NATS, cfg.ServiceName, logger.Logger)
	if err != nil {
		return nil, err
	}
	relay, err := outbox.NewRelay(pool, outbox.RelayOptions{
		Schema: Schema, Publisher: client, Logger: logger.Logger, Interval: cfg.Outbox.Interval,
		Batch: cfg.Outbox.Batch, Retention: cfg.Outbox.Retention, Metrics: registry,
	})
	if err != nil {
		client.Close()
		return nil, err
	}
	go func() {
		defer close(done)
		defer client.Close()
		_ = relay.Run(ctx)
	}()
	return done, nil
}
