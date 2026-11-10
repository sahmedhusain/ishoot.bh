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
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/audit/internal/app"
	"platform.local/backend/services/audit/internal/consumer"
	"platform.local/backend/services/audit/internal/httpapi"
	"platform.local/backend/services/audit/internal/postgres"
	"platform.local/backend/services/audit/migrations"
	"platform.local/backend/services/audit/settings"
)
func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "audit:", err)
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
		Level:	cfg.Log.Level, Format: cfg.Log.Format, Service: cfg.ServiceName, Version: cfg.Version, Env: cfg.AppEnv,
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
		return migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: logger.Logger})
	}
	svc := app.New(postgres.New(pool))
	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
	metrics := httpx.NewMetrics(cfg.ServiceName)
	switch command {
	case "serve":
		return serve(ctx, cfg, logger, svc, metrics, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	case "worker":
		return work(ctx, cfg, logger, svc, checker, metrics)
	}
	return fmt.Errorf("unknown command %q (serve, worker, migrate, healthcheck)", command)
}
func serve(ctx context.Context, cfg settings.Config, logger *logx.Logger, svc *app.Service, metrics *httpx.Metrics, admin http.Handler) error {
	if !cfg.Auth.Configured() {
		return errors.New("set AUTH_ISSUER and AUTH_JWKS_URL: the trail is read by IT accounts")
	}
	verifier, err := authn.NewVerifierFromConfig(cfg.Auth)
	if err != nil {
		return err
	}
	e, err := httpx.New(cfg.Common, logger, metrics)
	if err != nil {
		return err
	}
	e.Use(telemetry.EchoMiddleware())
	httpapi.Register(e, svc, httpapi.Options{
		Verifier:	verifier, DefaultPageSize: cfg.Audit.DefaultPageSize, MaxPageSize: cfg.Audit.MaxPageSize,
	})
	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("audit service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}
func work(ctx context.Context, cfg settings.Config, logger *logx.Logger, svc *app.Service, checker *health.Checker, metrics *httpx.Metrics) error {
	if !cfg.NATS.Configured() {
		return errors.New("set NATS_URL: the worker reads the events from NATS")
	}
	client, err := natsx.Connect(ctx, cfg.NATS, cfg.ServiceName, logger.Logger)
	if err != nil {
		return err
	}
	defer client.Close()
	checker.Register("nats", client.Check())
	c, err := consumer.New(svc, logger.Logger, metrics.Registry)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	done := make(chan error, 1)
	go func() {
		err := c.Run(ctx, client)
		if err != nil {
			logger.Error("audit consumer stopped", "error", err)
		}
		cancel()
		done <- err
	}()
	logger.Info("audit worker started")
	_, adminServer := httpx.Servers(cfg.Common, nil, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	runErr := httpx.Run(ctx, cfg.Common, logger, adminServer)
	return errors.Join(runErr, <-done)
}
