package main
import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"
	"github.com/google/uuid"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/live"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/redisx"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/realtime/internal/app"
	"platform.local/backend/services/realtime/internal/httpapi"
	"platform.local/backend/services/realtime/internal/hub"
	"platform.local/backend/services/realtime/internal/postgres"
	"platform.local/backend/services/realtime/internal/presence"
	"platform.local/backend/services/realtime/internal/subscriber"
	"platform.local/backend/services/realtime/migrations"
	"platform.local/backend/services/realtime/settings"
)
func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if err := run(command); err != nil {
		fmt.Fprintln(os.Stderr, "realtime:", err)
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
	if command == "migrate" {
		dbCfg = dbCfg.Session()
	}
	pool, err := db.Open(ctx, dbCfg, logger.Logger)
	if err != nil {
		return err
	}
	defer pool.Close()
	switch command {
	case "migrate":
		return migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: logger.Logger})
	case "serve":
		return serve(ctx, cfg, logger, postgres.New(pool), db.Check(pool))
	}
	return fmt.Errorf("unknown command %q (serve, migrate, healthcheck)", command)
}
func serve(ctx context.Context, cfg settings.Config, logger *logx.Logger, store *postgres.Store, dbCheck health.Check) error {
	if !cfg.Auth.Configured() {
		return errors.New("set AUTH_SERVICE_KEYS_FILE (and AUTH_ISSUER/AUTH_JWKS_URL for IT accounts)")
	}
	if !cfg.NATS.Configured() {
		return errors.New("set NATS_URL: every hint reaches the streams through NATS")
	}
	verifier, err := authn.NewVerifierFromConfig(cfg.Auth)
	if err != nil {
		return err
	}
	broker, err := natsx.Connect(ctx, cfg.NATS, cfg.ServiceName, logger.Logger)
	if err != nil {
		return err
	}
	defer broker.Close()
	valkey, err := redisx.Open(ctx, cfg.Redis)
	if err != nil {
		return err
	}
	defer func() { _ = valkey.Close() }()
	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("postgres", dbCheck)
	checker.Register("nats", broker.Check())
	checker.Register("redis", redisx.Check(valkey))
	metrics := httpx.NewMetrics(cfg.ServiceName)
	hostname, _ := os.Hostname()
	tracker := &presence.Redis{Client: valkey, Replica: hostname + "-" + uuid.NewString()[:8], TTL: cfg.Realtime.PresenceTTL,
		IdleTTL:	cfg.Realtime.IdleTTL, SeenTTL: 30 * 24 * time.Hour}
	svc := app.New(store, tracker, live.NATS{Conn: broker.Conn})
	streams := hub.New(cfg.Realtime.MaxStreamsPerUser)
	e, err := httpx.New(cfg.Common, logger, metrics)
	if err != nil {
		return err
	}
	e.Use(telemetry.EchoMiddleware())
	if err := httpapi.Register(e, svc, streams, httpapi.Options{
		Verifier:	verifier, Callers: cfg.Realtime.Callers, Heartbeat: cfg.Realtime.Heartbeat, MaxStreamAge: cfg.Realtime.MaxStreamAge,
		Retry:	cfg.Realtime.Retry, Buffer: cfg.Realtime.Buffer, MaxTopics: cfg.Realtime.MaxTopics,
		MaxPresenceIDs:	cfg.Realtime.MaxPresenceIDs, MaxSyncWindows: cfg.Realtime.MaxSyncWindows,
		Logger:	logger.Logger, Registerer: metrics.Registry,
	}); err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	go func() {
		if err := subscriber.Hints(ctx, broker.Conn, streams); err != nil {
			logger.Error("hint subscription stopped", "error", err)
			cancel()
		}
	}()
	go func() {
		if err := subscriber.Sessions(ctx, broker.JS, cfg.NATS.Stream, streams, logger.Logger); err != nil {
			logger.Warn("revoked sessions are not followed", "error", err)
		}
	}()
	go keepUp(ctx, cfg.Realtime, svc, tracker, streams, logger)
	public, adminServer := httpx.Servers(cfg.Common, telemetry.Handler(cfg.ServiceName, e), httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	logger.Info("realtime service starting")
	return httpx.Run(ctx, cfg.Common, logger, public, adminServer)
}
func keepUp(ctx context.Context, cfg settings.Realtime, svc *app.Service, tracker presence.Tracker, streams *hub.Hub, logger *logx.Logger) {
	refresh := time.NewTicker(cfg.PresenceTTL / 3)
	defer refresh.Stop()
	tick := time.NewTicker(cfg.Tick)
	defer tick.Stop()
	purge := time.NewTicker(time.Hour)
	defer purge.Stop()
	last := time.Now().UTC()
	for {
		select {
		case <-ctx.Done():
			return
		case <-refresh.C:
			if err := tracker.Refresh(ctx, streams.Users()); err != nil {
				logger.Warn("renewing presence marks", "error", err)
			}
		case now := <-tick.C:
			now = now.UTC()
			if err := svc.Tick(ctx, last, now); err != nil {
				logger.Warn("announcing status changes", "error", err)
				continue
			}
			last = now
		case <-purge.C:
			if err := svc.Purge(ctx, cfg.Retention); err != nil {
				logger.Warn("purging ended windows", "error", err)
			}
		}
	}
}
