// Command api runs the identity service. Subcommands: serve (default), worker, migrate, healthcheck, and
// bootstrap-it and recover-it (offline IT account provisioning; see the README).
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/redisx"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/jobs"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/internal/systemclient"
	"platform.local/backend/services/identity/migrations"
	"platform.local/backend/services/identity/settings"
)

func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "identity:", err)
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
	if command != "serve" && command != "migrate" && command != "worker" && command != "bootstrap-it" && command != "recover-it" {
		return fmt.Errorf("unknown command %q", command)
	}
	logger := logx.New(os.Stdout, logx.Options{Level: cfg.Log.Level, Format: cfg.Log.Format, Service: cfg.ServiceName, Version: cfg.Version, Env: cfg.AppEnv})
	dbCfg := cfg.Database
	if command == "migrate" || command == "worker" || command == "bootstrap-it" || command == "recover-it" {
		dbCfg = dbCfg.Session() // past the pooler: they need a whole session
	}
	pool, err := db.Open(ctx, dbCfg, logger.Logger)
	if err != nil {
		return err
	}
	defer pool.Close()
	if command == "migrate" {
		return migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger})
	}
	if command == "bootstrap-it" || command == "recover-it" {
		return provisionIT(ctx, command, os.Args[2:], cfg.Login, pool)
	}
	shutdownTracing, err := telemetry.Setup(ctx, cfg.Common)
	if err != nil {
		return err
	}
	defer func() { _ = shutdownTracing(context.WithoutCancel(ctx)) }()
	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", db.Check(pool))
	checker.Register("schema", func(ctx context.Context) error {
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT to_regclass('identity.session_family') IS NOT NULL AND to_regclass('identity.customer_provider') IS NOT NULL AND to_regclass('identity.customer_code') IS NOT NULL AND to_regclass('identity.profile_projection') IS NOT NULL AND to_regclass('identity.legacy_reset_challenge') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='identity' AND table_name='staff_access' AND column_name='data_scopes')`).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return errors.New("identity migrations not applied")
		}
		return nil
	})
	if command == "worker" {
		repo := postgres.New(pool)
		var projector *jobs.ProfileProjectionWorker
		if cfg.Access.ServiceKey != "" {
			signer, err := authn.NewServiceSigner("identity", cfg.Access.ServiceKey, 5*time.Minute)
			if err != nil {
				return err
			}
			projector = &jobs.ProfileProjectionWorker{Pool: pool, Transport: signer.Transport(nil), AdminURL: cfg.Projection.AdminURL, WebURL: cfg.Projection.WebURL}
		}
		client, err := jobs.NewClient(pool, repo, jobs.Options{Projection: projector, ProjectionInterval: cfg.Projection.Interval, Schema: "identity", CleanupInterval: cfg.Session.CleanupInterval, CleanupBatch: cfg.Session.CleanupBatch, Workers: cfg.Session.CleanupWorkers, Logger: logger.Logger})
		if err != nil {
			return err
		}
		if err = client.Start(ctx); err != nil {
			return err
		}
		metrics := httpx.NewMetrics(cfg.ServiceName)
		relayDone := make(chan struct{})
		if cfg.NATS.Configured() {
			broker, err := natsx.Connect(ctx, cfg.NATS, cfg.ServiceName, logger.Logger)
			if err != nil {
				return err
			}
			checker.Register("nats", broker.Check())
			relay, err := outbox.NewRelay(pool, outbox.RelayOptions{Schema: "identity", Publisher: broker, Logger: logger.Logger,
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
			logger.Warn("NATS_URL is not set: events stay in identity.outbox until a relay publishes them")
			close(relayDone)
		}
		_, admin := httpx.Servers(cfg.Common, nil, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
		runErr := httpx.Run(ctx, cfg.Common, logger, admin)
		stopCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
		defer cancel()
		<-relayDone
		return errors.Join(runErr, client.Stop(stopCtx))
	}
	if cfg.Auth.ServiceKeysFile == "" {
		return errors.New("AUTH_SERVICE_KEYS_FILE must be set")
	}
	verifier, err := authn.NewVerifierFromConfig(cfg.Auth)
	if err != nil {
		return err
	}
	issuer, err := cfg.Signing.LoadIssuer()
	if err != nil {
		return err
	}
	svc, err := sessions.NewWithLifetimes(postgres.New(pool), sessions.Lifetimes{
		Customer: cfg.Session.TTL, Staff: cfg.Session.StaffTTL, IT: cfg.Session.ITTTL,
	})
	if err != nil {
		return err
	}
	var login *accounts.Service
	var manager *app.ITAccounts
	var managed *app.ManagedAccounts
	var customerCodes *app.CustomerCodes
	var customerOAuth *app.CustomerOAuth
	if cfg.Login.Enabled {
		services, err := newLogin(ctx, cfg, pool, svc)
		if err != nil {
			return err
		}
		defer services.redis.Close()
		login, manager, managed, customerCodes, customerOAuth = services.login, services.it, services.managed, services.codes, services.oauth
		checker.Register("redis", redisx.Check(services.redis))
		checker.Register("accounts_schema", func(ctx context.Context) error {
			var exists bool
			if err := pool.QueryRow(ctx, `SELECT to_regclass('identity.account') IS NOT NULL`).Scan(&exists); err != nil {
				return err
			}
			if !exists {
				return errors.New("identity account migration not applied")
			}
			return nil
		})
	}
	metrics := httpx.NewMetrics(cfg.ServiceName)
	e, err := httpx.New(cfg.Common, logger, metrics)
	if err != nil {
		return err
	}
	e.Use(telemetry.EchoMiddleware())
	httpapi.Register(e, verifier, svc, issuer, login, cfg.Session.JSONBodyLimit, map[authn.Realm][]string{authn.RealmStaff: cfg.Callers.Staff, authn.RealmCustomer: cfg.Callers.Customer, authn.RealmIT: cfg.Callers.IT})
	if managed != nil {
		httpapi.RegisterCustomerOAuth(e, verifier, issuer, customerOAuth, cfg.Callers.Customer, cfg.Session.JSONBodyLimit)
		httpapi.RegisterCustomerCodes(e, verifier, issuer, customerCodes, cfg.Callers.Customer, cfg.Session.JSONBodyLimit)
		httpapi.RegisterManagedAccounts(e, verifier, managed, map[authn.Realm][]string{authn.RealmStaff: cfg.Callers.Staff, authn.RealmCustomer: cfg.Callers.Customer, authn.RealmIT: cfg.Callers.IT}, cfg.Session.JSONBodyLimit)
		httpapi.RegisterSelfService(e, issuer.Verifier(), app.NewSelfService(pool, login, cfg.Login.PasswordMinLength), cfg.Session.JSONBodyLimit)
	}
	if manager != nil {
		httpapi.RegisterITAccounts(e, issuer.Verifier(), manager, cfg.Session.JSONBodyLimit)
		httpapi.RegisterDeskSessions(e, issuer.Verifier(), app.NewDeskSessions(pool))
		var modules func(context.Context) (map[string]bool, error)
		if cfg.Access.ServiceKey != "" {
			signer, err := authn.NewServiceSigner("identity", cfg.Access.ServiceKey, 5*time.Minute)
			if err != nil {
				return fmt.Errorf("IDENTITY_SERVICE_KEY: %w", err)
			}
			modules = systemclient.New(cfg.Access.SystemURL, signer.Transport(nil)).Load
		}
		httpapi.RegisterDeskStaff(e, issuer.Verifier(), app.NewDeskStaff(pool, modules), cfg.Session.JSONBodyLimit)
		staffPolicy := app.NewStaffAccess(pool, modules)
		httpapi.RegisterStaffAccess(e, issuer.Verifier(), verifier, staffPolicy)
		httpapi.RegisterStaffAccessService(e, verifier, staffPolicy)
	}
	public, admin := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	logger.Info("identity session API starting")
	return httpx.Run(ctx, cfg.Common, logger, public, admin)
}
