// Package redisx opens the Redis (Valkey) client services share for caching and rate limiting.
package redisx

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/extra/redisotel/v9"
	"github.com/redis/go-redis/v9"

	"platform.local/backend/pkg/health"
)

// Config is embedded in a service config with envPrefix:"REDIS_".
type Config struct {
	URL string `env:"URL" validate:"required,url"`
}

// Open parses the URL (redis:// or rediss://), adds tracing and checks the connection.
func Open(ctx context.Context, cfg Config) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("redisx: parsing REDIS_URL: %w", err)
	}
	client := redis.NewClient(opts)
	if err := redisotel.InstrumentTracing(client); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redisx: tracing: %w", err)
	}
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redisx: connecting: %w", err)
	}
	return client, nil
}

// Check is a readiness check for the client.
func Check(client redis.UniversalClient) health.Check {
	return func(ctx context.Context) error { return client.Ping(ctx).Err() }
}
