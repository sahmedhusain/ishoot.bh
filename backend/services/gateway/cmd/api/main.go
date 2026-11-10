package main
import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/ratelimit"
	"platform.local/backend/pkg/redisx"
	"platform.local/backend/pkg/telemetry"
	"platform.local/backend/services/gateway/internal/app"
	"platform.local/backend/services/gateway/internal/proxy"
	"platform.local/backend/services/gateway/internal/routes"
	"platform.local/backend/services/gateway/settings"
)
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "gateway:", err)
		os.Exit(1)
	}
}
func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	var cfg settings.Config
	if err := config.Load(&cfg); err != nil {
		return err
	}
	if len(os.Args) > 1 && os.Args[1] == httpx.HealthcheckCommand {
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
	table, err := routes.Load(cfg.Gateway.RoutesFile, cfg.Gateway.Upstreams)
	if err != nil {
		return err
	}
	redisClient, err := redisx.Open(ctx, cfg.Redis)
	if err != nil {
		return err
	}
	defer redisClient.Close()
	var verifier *authn.Verifier
	if cfg.Auth.Configured() {
		if verifier, err = authn.NewVerifierFromConfig(cfg.Auth); err != nil {
			return err
		}
	}
	metrics := httpx.NewMetrics(cfg.ServiceName)
	public, err := app.NewHandler(cfg, table, app.Dependencies{
		Logger:		logger,
		Metrics:	metrics,
		Limiter:	ratelimit.NewRedisLimiter(redisClient, cfg.Gateway.RateLimitPrefix),
		Verifier:	verifier,
		Transport: proxy.NewTransport(proxy.TransportConfig{
			DialTimeout:		cfg.Gateway.DialTimeout,
			ResponseHeaderTimeout:	cfg.Gateway.ResponseHeaderTimeout,
			IdleConnTimeout:	cfg.Gateway.IdleConnTimeout,
			MaxIdleConnsPerHost:	cfg.Gateway.MaxIdleConnsPerHost,
		}),
	})
	if err != nil {
		return err
	}
	checker := health.NewChecker(cfg.ServiceName, cfg.Version, cfg.Admin.ReadinessTimeout)
	checker.Register("redis", redisx.Check(redisClient))
	publicServer, adminServer := httpx.Servers(cfg.Common, public, httpx.AdminHandler(cfg.Common, logger, checker, metrics))
	logger.Info("gateway starting", "routes", len(table.Routes))
	return httpx.Run(ctx, cfg.Common, logger, publicServer, adminServer)
}
