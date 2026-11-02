package main

import (
	"context"
	"encoding/base64"
	"errors"
	"net/netip"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/ratelimit"
	"platform.local/backend/pkg/redisx"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/guard"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/internal/systemclient"
	"platform.local/backend/services/identity/settings"
	"time"
)

type loginServices struct {
	login   *accounts.Service
	it      *app.ITAccounts
	managed *app.ManagedAccounts
	codes   *app.CustomerCodes
	oauth   *app.CustomerOAuth
	redis   *redis.Client
}

func newLogin(ctx context.Context, configuration settings.Config, pool *pgxpool.Pool, sessionService *sessions.Service) (*loginServices, error) {
	cfg := configuration.Login
	key, err := base64.RawURLEncoding.Strict().DecodeString(cfg.RateKey)
	if err != nil || len(key) != 32 {
		return nil, errors.New("IDENTITY_LOGIN_RATE_KEY must be 32 bytes encoded as base64url")
	}
	hasher, err := password.New(cfg.Password)
	if err != nil {
		return nil, err
	}
	otp, err := totp.New(cfg.TOTP)
	if err != nil {
		return nil, err
	}
	ring, err := secrets.NewKeyring(secrets.Config{Keys: cfg.MFAKeys, PrimaryKeyID: cfg.MFAPrimaryID, LegacyMFAKey: cfg.MFALegacyKey})
	if err != nil {
		return nil, err
	}
	allowed := make([]netip.Prefix, 0, len(cfg.ITAllowedCIDRs))
	for _, value := range cfg.ITAllowedCIDRs {
		prefix, err := netip.ParsePrefix(value)
		if err != nil {
			return nil, err
		}
		allowed = append(allowed, prefix.Masked())
	}
	redisClient, err := redisx.Open(ctx, redisx.Config{URL: cfg.RedisURL})
	if err != nil {
		return nil, err
	}
	limiter := ratelimit.NewRedisLimiter(redisClient, "identity:rl:")
	policy, err := guard.New(limiter, key, ratelimit.Rule{Name: "account", Requests: cfg.AccountAttempts, Window: cfg.RateWindow}, ratelimit.Rule{Name: "ip", Requests: cfg.IPAttempts, Window: cfg.RateWindow}, allowed)
	if err != nil {
		_ = redisClient.Close()
		return nil, err
	}
	svc, err := accounts.New(postgres.New(pool), hasher, ring, otp, sessionService, cfg.MaxConcurrentKDF, policy.ForAction("signin"), accounts.MFAConfig{EnrollmentTTL: cfg.MFAEnrollmentTTL, RecoveryCount: cfg.MFARecoveryCount, Digits: cfg.TOTP.Digits, Period: cfg.TOTP.Period})
	if err != nil {
		_ = redisClient.Close()
		return nil, err
	}
	manager := app.NewITAccounts(pool, hasher, ring, bootstrap.Input{MinPasswordLength: cfg.ITPasswordMinLength,
		RecoveryCount: cfg.MFARecoveryCount, Issuer: cfg.MFAIssuer, Digits: cfg.TOTP.Digits, Period: cfg.TOTP.Period}, cfg.MaxConcurrentKDF)
	managed := app.NewManagedAccounts(pool, hasher, cfg.PasswordMinLength, cfg.PasswordResetTTL, cfg.MaxConcurrentKDF, policy.CheckAction)
	codes := app.NewCustomerCodes(pool, policy.ForAction("code"), sessionService, svc, key, policy.ForAction("code-verify"))
	var source func(context.Context, string) (systemclient.SignInConfiguration, error)
	if configuration.Access.ServiceKey != "" {
		signer, err := authn.NewServiceSigner("identity", configuration.Access.ServiceKey, 5*time.Minute)
		if err != nil {
			_ = redisClient.Close()
			return nil, err
		}
		source = systemclient.New(configuration.Access.SystemURL, signer.Transport(nil)).SignIn
	}
	return &loginServices{login: svc, it: manager, managed: managed, codes: codes, oauth: app.NewCustomerOAuth(pool, codes, ring, source, cfg.CustomerWebURL, policy.ForAction("oauth")), redis: redisClient}, nil
}
