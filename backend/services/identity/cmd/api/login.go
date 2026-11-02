package main

import (
	"context"
	"encoding/base64"
	"errors"
	"net/netip"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

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
	"platform.local/backend/services/identity/settings"
)

func newLogin(ctx context.Context, cfg settings.Login, pool *pgxpool.Pool, sessionService *sessions.Service) (*accounts.Service, *app.ITAccounts, *redis.Client, error) {
	key, err := base64.RawURLEncoding.Strict().DecodeString(cfg.RateKey)
	if err != nil || len(key) != 32 {
		return nil, nil, nil, errors.New("IDENTITY_LOGIN_RATE_KEY must be 32 bytes encoded as base64url")
	}
	hasher, err := password.New(cfg.Password)
	if err != nil {
		return nil, nil, nil, err
	}
	otp, err := totp.New(cfg.TOTP)
	if err != nil {
		return nil, nil, nil, err
	}
	ring, err := secrets.NewKeyring(secrets.Config{Keys: cfg.MFAKeys, PrimaryKeyID: cfg.MFAPrimaryID, LegacyMFAKey: cfg.MFALegacyKey})
	if err != nil {
		return nil, nil, nil, err
	}
	allowed := make([]netip.Prefix, 0, len(cfg.ITAllowedCIDRs))
	for _, value := range cfg.ITAllowedCIDRs {
		prefix, err := netip.ParsePrefix(value)
		if err != nil {
			return nil, nil, nil, err
		}
		allowed = append(allowed, prefix.Masked())
	}
	redisClient, err := redisx.Open(ctx, redisx.Config{URL: cfg.RedisURL})
	if err != nil {
		return nil, nil, nil, err
	}
	limiter := ratelimit.NewRedisLimiter(redisClient, "identity:rl:")
	policy, err := guard.New(limiter, key, ratelimit.Rule{Name: "account", Requests: cfg.AccountAttempts, Window: cfg.RateWindow}, ratelimit.Rule{Name: "ip", Requests: cfg.IPAttempts, Window: cfg.RateWindow}, allowed)
	if err != nil {
		_ = redisClient.Close()
		return nil, nil, nil, err
	}
	svc, err := accounts.New(postgres.New(pool), hasher, ring, otp, sessionService, cfg.MaxConcurrentKDF, policy, accounts.MFAConfig{EnrollmentTTL: cfg.MFAEnrollmentTTL, RecoveryCount: cfg.MFARecoveryCount, Digits: cfg.TOTP.Digits, Period: cfg.TOTP.Period})
	if err != nil {
		_ = redisClient.Close()
		return nil, nil, nil, err
	}
	manager := app.NewITAccounts(pool, hasher, ring, bootstrap.Input{MinPasswordLength: cfg.ITPasswordMinLength,
		RecoveryCount: cfg.MFARecoveryCount, Issuer: cfg.MFAIssuer, Digits: cfg.TOTP.Digits, Period: cfg.TOTP.Period}, cfg.MaxConcurrentKDF)
	return svc, manager, redisClient, nil
}
