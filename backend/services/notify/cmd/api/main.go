// Command api runs the notify service. Subcommands:
//
//	serve        the HTTP API callers queue messages with, and IT's desk (default)
//	worker       delivers queued messages and publishes the service's events
//	migrate      create or upgrade the notify schema and River's tables, then exit
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
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/live"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/notify/internal/app"
	"platform.local/backend/services/notify/internal/httpapi"
	"platform.local/backend/services/notify/internal/jobs"
	"platform.local/backend/services/notify/internal/postgres"
	"platform.local/backend/services/notify/internal/providers"
	"platform.local/backend/services/notify/migrations"
	"platform.local/backend/services/notify/settings"
)

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "notify:", err)
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
		return migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger})
	}

	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
	metrics := httpx.NewMetrics(cfg.ServiceName)
	opts := app.Options{MaxAttempts: cfg.Notify.MaxAttempts, MaxAttachmentBytes: cfg.Notify.MaxAttachmentBytes}
	jobOpts := jobs.Options{Schema: postgres.Schema, Workers: cfg.Notify.Workers, MaxAttempts: cfg.Notify.MaxAttempts,
		SendTimeout: cfg.Notify.SendTimeout, Logger: logger.Logger,
		InboxRetention: cfg.Notify.InboxRetention, PurgeEvery: cfg.Notify.InboxPurgeEvery}

	switch command {
	case "serve":
		svc := app.New(postgres.New(pool), nil, opts)
		svc.SetLiveWindow(cfg.Notify.InboxLiveWindow)
		inserter, err := jobs.NewClient(pool, nil, jobOpts)
		if err != nil {
			return err
		}
		svc.SetJobs(inserter)
		// Live hints for the in-app inbox go over NATS core (ADR 0012); without NATS, browsers catch up on resync.
		if cfg.NATS.Configured() {
			broker, err := natsx.Connect(ctx, cfg.NATS, cfg.ServiceName, logger.Logger)
			if err != nil {
				return err
			}
			defer broker.Close()
			checker.Register("nats", broker.Check())
			svc.SetLive(live.NATS{Conn: broker.Conn})
		}
		return serve(ctx, cfg, logger, svc, metrics, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	case "worker":
		senders, err := buildSenders(cfg.Notify)
		if err != nil {
			return err
		}
		opts.Senders = senders
		svc := app.New(postgres.New(pool), nil, opts)
		return work(ctx, cfg, logger, pool, svc, jobOpts, checker, metrics)
	}
	return fmt.Errorf("unknown command %q (serve, worker, migrate, healthcheck)", command)
}

// buildSenders picks each channel's provider. Credentials kept by the system service are read with this service's
// own token, so the key is needed only when a channel uses an integration.
func buildSenders(cfg settings.Notify) (map[string]providers.Sender, error) {
	client := &http.Client{Timeout: cfg.SendTimeout}
	var integration providers.CredentialSource
	if cfg.EmailProvider == "integration" || cfg.WhatsAppCredentials == "integration" {
		signer, err := authn.NewServiceSigner("notify", cfg.ServiceKey, 5*time.Minute)
		if err != nil {
			return nil, fmt.Errorf("NOTIFY_SERVICE_KEY (to read integration credentials): %w", err)
		}
		integration = providers.SystemCredentials{BaseURL: cfg.SystemURL,
			Client: &http.Client{Timeout: 10 * time.Second, Transport: signer.Transport(nil)}}
	}
	senders := map[string]providers.Sender{}
	if cfg.EmailProvider == "smtp" {
		senders[app.Email] = providers.SMTP{Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUsername,
			Password: cfg.SMTPPassword, TLS: cfg.SMTPTLS, From: cfg.EmailFrom, Timeout: cfg.SendTimeout}
	} else {
		senders[app.Email] = providers.Resend{BaseURL: cfg.ResendURL, Credentials: integration, Client: client}
	}
	whatsapp := integration
	if cfg.WhatsAppCredentials == "static" {
		whatsapp = providers.Static{"whatsapp": {"phoneId": cfg.WhatsAppPhoneID, "token": cfg.WhatsAppToken}}
	}
	senders[app.WhatsApp] = providers.WhatsApp{BaseURL: cfg.WhatsAppURL, Credentials: whatsapp, Client: client}
	return senders, nil
}

func serve(ctx context.Context, cfg settings.Config, logger *logx.Logger, svc *app.Service, metrics *httpx.Metrics, admin http.Handler) error {
	if !cfg.Auth.Configured() {
		return errors.New("set AUTH_SERVICE_KEYS_FILE (and AUTH_ISSUER/AUTH_JWKS_URL for the IT desk)")
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
		Verifier: verifier, SendCallers: cfg.Notify.SendCallers, BodyLimit: cfg.Notify.BodyLimit,
		InboxCallers: cfg.Notify.InboxCallers, InboxBodyLimit: cfg.Notify.InboxBodyLimit,
		DefaultPageSize: cfg.Notify.DefaultPageSize, MaxPageSize: cfg.Notify.MaxPageSize,
	})
	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), admin)
	logger.Info("notify service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}

// work delivers messages, and publishes notify.outbox (written by both the API and the deliveries) to NATS.
func work(ctx context.Context, cfg settings.Config, logger *logx.Logger, pool *pgxpool.Pool, svc *app.Service,
	jobOpts jobs.Options, checker *health.Checker, metrics *httpx.Metrics) error {
	client, err := jobs.NewClient(pool, svc, jobOpts)
	if err != nil {
		return err
	}
	svc.SetJobs(client)
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
		svc.SetLive(live.NATS{Conn: broker.Conn}) // scheduled notifications ring when they become due
		relay, err := outbox.NewRelay(pool, outbox.RelayOptions{Schema: postgres.Schema, Publisher: broker, Logger: logger.Logger,
			Interval: cfg.Outbox.Interval, Batch: cfg.Outbox.Batch, Retention: cfg.Outbox.Retention, Metrics: metrics.Registry})
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
		logger.Warn("NATS_URL is not set: events stay in notify.outbox until a relay publishes them")
		close(relayDone)
	}
	logger.Info("notify worker started")
	// The worker serves only the admin listener (probes, metrics, log level).
	_, adminServer := httpx.Servers(cfg.Common, nil, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	runErr := httpx.Run(ctx, cfg.Common, logger, adminServer)
	stopCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
	defer cancel()
	<-relayDone
	return errors.Join(runErr, client.Stop(stopCtx))
}
