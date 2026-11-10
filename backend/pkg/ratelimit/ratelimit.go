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
type Rule struct {
	Name		string
	Requests	int
	Window		time.Duration
	Burst		int
}
func (r Rule) Validate() error {
	if r.Name == "" || r.Requests <= 0 || r.Window <= 0 || r.Burst < 0 {
		return fmt.Errorf("ratelimit: invalid rule %+v", r)
	}
	return nil
}
type Decision struct {
	Allowed		bool
	Limit		int
	Remaining	int
	RetryAfter	time.Duration
}
type Limiter interface {
	Allow(ctx context.Context, key string, rule Rule) (Decision, error)
}
type RedisLimiter struct {
	limiter	*redis_rate.Limiter
	prefix	string
}
func NewRedisLimiter(client redis.UniversalClient, prefix string) *RedisLimiter {
	return &RedisLimiter{limiter: redis_rate.NewLimiter(client), prefix: prefix}
}
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
type KeyFunc func(c echo.Context) string
func ByPrincipalOrIP(c echo.Context) string {
	if p, ok := authn.PrincipalFrom(c.Request().Context()); ok {
		return string(p.Realm) + ":" + p.Subject
	}
	return "ip:" + c.RealIP()
}
type Options struct {
	Rule	Rule
	Key	KeyFunc
	FailOpen	bool
	Logger		*logx.Logger
}
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
