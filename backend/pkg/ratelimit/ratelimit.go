// Package ratelimit limits request rates per client with a shared Redis store (GCRA), so every replica of a
// service enforces the same limit.
package ratelimit

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/go-redis/redis_rate/v10"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
)

// Rule allows Requests per Window, with bursts of up to Burst (Requests when zero).
type Rule struct {
	Name     string
	Requests int
	Window   time.Duration
	Burst    int
}

// Validate checks that the rule can be enforced.
func (r Rule) Validate() error {
	if r.Name == "" || r.Requests <= 0 || r.Window <= 0 || r.Burst < 0 {
		return fmt.Errorf("ratelimit: invalid rule %+v", r)
	}
	return nil
}

// Decision is the outcome of one check.
type Decision struct {
	Allowed    bool
	Limit      int
	Remaining  int
	RetryAfter time.Duration
}

// Limiter decides whether one more request under key is allowed.
type Limiter interface {
	Allow(ctx context.Context, key string, rule Rule) (Decision, error)
}

// RedisLimiter stores counters in Redis under prefix.
type RedisLimiter struct {
	limiter *redis_rate.Limiter
	prefix  string
}

// NewRedisLimiter returns a limiter using client.
func NewRedisLimiter(client redis.UniversalClient, prefix string) *RedisLimiter {
	return &RedisLimiter{limiter: redis_rate.NewLimiter(client), prefix: prefix}
}

// Allow records one request and reports whether it is within the rule.
func (l *RedisLimiter) Allow(ctx context.Context, key string, rule Rule) (Decision, error) {
	burst := rule.Burst
	if burst == 0 {
		burst = rule.Requests
	}
	res, err := l.limiter.Allow(ctx, l.prefix+rule.Name+":"+key, redis_rate.Limit{Rate: rule.Requests, Period: rule.Window, Burst: burst})
	if err != nil {
		return Decision{}, err
	}
	return Decision{Allowed: res.Allowed > 0, Limit: rule.Requests, Remaining: res.Remaining, RetryAfter: res.RetryAfter}, nil
}

// KeyFunc picks the identity a request is counted under.
type KeyFunc func(c echo.Context) string

// ByPrincipalOrIP counts signed-in callers by account and everyone else by client IP.
func ByPrincipalOrIP(c echo.Context) string {
	if p, ok := authn.PrincipalFrom(c.Request().Context()); ok {
		return string(p.Realm) + ":" + p.Subject
	}
	return "ip:" + c.RealIP()
}

// Options configures Middleware.
type Options struct {
	Rule Rule
	Key  KeyFunc
	// FailOpen lets requests through when the store is unreachable instead of answering 503.
	FailOpen bool
	Logger   *logx.Logger
}

// Middleware enforces opts.Rule and sets the RateLimit-* and Retry-After response headers.
func Middleware(limiter Limiter, opts Options) echo.MiddlewareFunc {
	key := opts.Key
	if key == nil {
		key = ByPrincipalOrIP
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx := c.Request().Context()
			decision, err := limiter.Allow(ctx, key(c), opts.Rule)
			if err != nil {
				if opts.Logger != nil {
					opts.Logger.WarnContext(ctx, "rate limit store unavailable", slog.String("rule", opts.Rule.Name), slog.Any("error", err))
				}
				if opts.FailOpen {
					return next(c)
				}
				return problem.New(503, problem.CodeUnavailable, "")
			}
			header := c.Response().Header()
			header.Set("RateLimit-Limit", strconv.Itoa(decision.Limit))
			header.Set("RateLimit-Remaining", strconv.Itoa(max(decision.Remaining, 0)))
			if !decision.Allowed {
				header.Set("Retry-After", strconv.Itoa(int(max(decision.RetryAfter.Round(time.Second), time.Second).Seconds())))
				return problem.New(429, problem.CodeRateLimited, "")
			}
			return next(c)
		}
	}
}
