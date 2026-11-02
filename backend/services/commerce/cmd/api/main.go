// Command api runs the commerce service. Subcommands:
//
//	serve        the HTTP API (default)
//	migrate      create or upgrade the commerce schema, then exit
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
	"platform.local/backend/services/commerce/internal/app"
	"platform.local/backend/services/commerce/internal/httpapi"
	"platform.local/backend/services/commerce/internal/postgres"
	"platform.local/backend/services/commerce/migrations"
	"platform.local/backend/services/commerce/settings"
)

const Schema = "commerce"

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "commerce:", err)
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
	verifier, err := authn.NewVerifier(ctx, cfg.Auth, logger.Logger)
	if err != nil {
		return err
	}

	e := httpx.NewEcho(logger, httpx.EchoOptions{
		ServiceName: cfg.ServiceName,
		Metrics:     metrics,
	})
	httpapi.Register(e, svc, httpapi.Options{
		Verifier: verifier,
		Readers:  cfg.Commerce.Readers,
		Writers:  cfg.Commerce.Writers,
	})

	if cfg.NATS.URL != "" {
		nc, nerr := natsx.Connect(ctx, cfg.NATS, logger.Logger)
		if nerr != nil {
			return nerr
		}
		defer nc.Close()
		relay := outbox.NewRelay(pool, Schema, nc, logger.Logger, outbox.RelayOptions{
			BatchSize:    cfg.Outbox.BatchSize,
			PollInterval: cfg.Outbox.PollInterval,
		})
		go relay.Run(ctx)
	}

	servers := httpx.NewServerGroup()
	servers.Add(cfg.HTTP.Addr, e, cfg.HTTP.ReadTimeout, cfg.HTTP.WriteTimeout)
	servers.Add(cfg.Admin.Addr, admin, cfg.Admin.ReadTimeout, cfg.Admin.WriteTimeout)

	reg := prometheus.DefaultRegisterer
	db.RegisterMetrics(reg, pool, Schema)
	outbox.RegisterMetrics(reg, pool, Schema)

	return servers.Start(ctx)
}