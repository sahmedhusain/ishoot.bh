// Command api starts the incomplete identity session API, runs migrations, or probes readiness.
package main

import (
	"context"
	"errors"
	"fmt"
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
	"platform.local/backend/pkg/redisx"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/jobs"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
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
	if command != "serve" && command != "migrate" && command != "worker" {
		return fmt.Errorf("unknown command %q", command)
	}
	logger := logx.New(os.Stdout, logx.Options{Level: cfg.Log.Level, Format: cfg.Log.Format, Service: cfg.ServiceName, Version: cfg.Version, Env: cfg.AppEnv})
	pool, err := db.Open(ctx, cfg.Database, logger.Logger)
	if err != nil {
		return err
	}
	defer pool.Close()
	if command == "migrate" {
		return migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger})
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
		if err := pool.QueryRow(ctx, `SELECT to_regclass('identity.session_family') IS NOT NULL`).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return errors.New("identity migrations not applied")
		}
		return nil
	})
	if command == "worker" {
		repo := postgres.New(pool)
		client, err := jobs.NewClient(pool, repo, jobs.Options{Schema: "identity", CleanupInterval: cfg.Session.CleanupInterval, CleanupBatch: cfg.Session.CleanupBatch, Workers: cfg.Session.CleanupWorkers, Logger: logger.Logger})
		if err != nil {
			return err
		}
		if err = client.Start(ctx); err != nil {
			return err
		}
		metrics := httpx.NewMetrics(cfg.ServiceName)
		_, admin := httpx.Servers(cfg.Common, nil, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
		runErr := httpx.Run(ctx, cfg.Common, logger, admin)
		stopCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
		defer cancel()
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
	svc, err := sessions.New(postgres.New(pool), cfg.Session.TTL)
	if err != nil {
		return err
	}
	var login *accounts.Service
	if cfg.Login.Enabled {
		service, client, err := newLogin(ctx, cfg.Login, pool, svc)
		if err != nil {
			return err
		}
		defer client.Close()
		login = service
		checker.Register("redis", redisx.Check(client))
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
	public, admin := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	logger.Info("identity session API starting")
	return httpx.Run(ctx, cfg.Common, logger, public, admin)
}
