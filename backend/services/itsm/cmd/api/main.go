package main
import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
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
	"platform.local/backend/services/itsm/internal/app"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/httpapi"
	"platform.local/backend/services/itsm/internal/jobs"
	"platform.local/backend/services/itsm/internal/notifyclient"
	"platform.local/backend/services/itsm/internal/postgres"
	"platform.local/backend/services/itsm/migrations"
	"platform.local/backend/services/itsm/settings"
)
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
		return migrate.Run(ctx, pool, migrate.Options{Schema: Schema, Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger})
	}
	svc := app.New(postgres.New(pool), app.Options{
		Limits: domain.Limits{
			MaxAttachments:		cfg.ITSM.MaxAttachments,
			MaxAttachmentSize:	cfg.ITSM.MaxAttachmentSize,
		},
		ITDisplayName:	cfg.ITSM.ITDisplayName,
		BreachBatch:	cfg.ITSM.BreachBatch,
		ReminderWindow:	cfg.ITSM.ReminderWindow,
		ReminderBatch:	cfg.ITSM.ReminderBatch,
	})
	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
	metrics := httpx.NewMetrics(cfg.ServiceName)
	admin := httpx.AdminHandler(cfg.Common, logger, checker, metrics)
	switch command {
	case "serve":
		return serve(ctx, cfg, logger, pool, svc, metrics, admin)
	case "worker":
		return work(ctx, cfg, logger, pool, svc, admin, checker, metrics)
	}
	return fmt.Errorf("unknown command %q (serve, worker, migrate, healthcheck)", command)
}
func serve(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, svc *app.Service, metrics *httpx.Metrics, admin http.Handler) error {
	if !cfg.Auth.Configured() {
		return errors.New("set AUTH_SERVICE_KEYS_FILE (and AUTH_ISSUER/AUTH_JWKS_URL once identity runs)")
	}
	verifier, err := authn.NewVerifierFromConfig(cfg.Auth)
	if err != nil {
		return err
	}
	inserter, err := jobs.NewClient(pool, nil, jobs.Options{Schema: Schema, Logger: logger.Logger})
	if err != nil {
		return err
	}
	svc.SetJobInserter(inserter)
	e, err := httpx.New(cfg.Common, logger, metrics)
	if err != nil {
		return err
	}
	e.Use(telemetry.EchoMiddleware())
	httpapi.Register(e, svc, httpapi.Options{
		Verifier:	verifier, RequestCallers: cfg.ITSM.RequestCallers, JSONBodyLimit: cfg.ITSM.JSONBodyLimit,
		DefaultPageSize:	cfg.ITSM.DefaultPageSize, MaxPageSize: cfg.ITSM.MaxPageSize,
	})
	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("itsm service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}
func work(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, svc *app.Service, admin http.Handler, checker *health.Checker, metrics *httpx.Metrics) error {
	var transport http.RoundTripper
	if cfg.ITSM.ServiceKey != "" {
		signer, err := authn.NewServiceSigner("itsm", cfg.ITSM.ServiceKey, 5*time.Minute)
		if err != nil {
			return err
		}
		transport = signer.Transport(nil)
	}
	notifier := notifyclient.New(cfg.ITSM.NotifyURL, transport)
	client, err := jobs.NewClient(pool, svc, jobs.Options{
		Schema:			Schema,
		BreachInterval:		cfg.ITSM.BreachInterval,
		ReminderInterval:	cfg.ITSM.ReminderInterval,
		Workers:		cfg.ITSM.Workers,
		Logger:			logger.Logger,
		Notifier:		notifier,
	})
	if err != nil {
		return err
	}
	svc.SetJobInserter(client)
	if err := client.Start(ctx); err != nil {
		return err
	}
	relayDone := make(chan struct{})
	if cfg.NATS.Configured() {
		broker, err := natsx.Connect(ctx, cfg.NATS, cfg.ServiceName, logger.Logger)
		if err != nil {
			return err
		}
		checker.Register("nats", broker.Check())
		relay, err := outbox.NewRelay(pool, outbox.RelayOptions{
			Schema:		Schema,
			Publisher:	broker,
			Logger:		logger.Logger,
			Interval:	cfg.Outbox.Interval,
			Batch:		cfg.Outbox.Batch,
			Retention:	cfg.Outbox.Retention,
			Metrics:	metrics.Registry,
		})
		if err != nil {
			broker.Close()
			return err
		}
		go func() {
			defer close(relayDone)
			defer broker.Close()
			_ = relay.Run(ctx)
		}()
	} else {
		logger.Warn("NATS_URL is not set: events stay in itsm.outbox until a relay publishes them")
		close(relayDone)
	}
	logger.Info("itsm worker started")
	_, adminServer := httpx.Servers(cfg.Common, nil, admin)
	runErr := httpx.Run(ctx, cfg.Common, logger, adminServer)
	stopCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
	defer cancel()
	<-relayDone
	return errors.Join(runErr, client.Stop(stopCtx))
}
