// Package guard enforces identity login rate limits and the optional IT network allow-list.
package guard

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/netip"
	"strings"
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/ratelimit"
)

var ErrDenied = errors.New("login denied")
var ErrUnavailable = errors.New("login rate limit unavailable")

// Limited carries only the wait duration; it never includes an account identifier.
type Limited struct{ RetryAfter time.Duration }

func (e *Limited) Error() string { return "login rate limited" }

type Guard struct {
	limiter     ratelimit.Limiter
	key         []byte
	account, ip ratelimit.Rule
	allow       []netip.Prefix
}

func New(limiter ratelimit.Limiter, key []byte, account, ip ratelimit.Rule, allow []netip.Prefix) (*Guard, error) {
	if limiter == nil || len(key) != 32 {
		return nil, errors.New("invalid login rate-limit configuration")
	}
	if err := account.Validate(); err != nil {
		return nil, err
	}
	if err := ip.Validate(); err != nil {
		return nil, err
	}
	if account.Name == ip.Name {
		return nil, errors.New("login rate-limit rules must use distinct names")
	}
	allowed := make([]netip.Prefix, 0, len(allow))
	for _, prefix := range allow {
		if !prefix.IsValid() {
			return nil, errors.New("invalid IT network prefix")
		}
		if prefix.Addr().Is4In6() {
			if prefix.Bits() < 96 {
				return nil, errors.New("ambiguous mapped IPv4 prefix")
			}
			prefix = netip.PrefixFrom(prefix.Addr().Unmap(), prefix.Bits()-96)
		}
		allowed = append(allowed, prefix.Masked())
	}
	return &Guard{limiter: limiter, key: append([]byte(nil), key...), account: account, ip: ip, allow: allowed}, nil
}
func (g *Guard) digest(kind string, realm authn.Realm, value string) string {
	mac := hmac.New(sha256.New, g.key)
	_, _ = fmt.Fprintf(mac, "%s\x00%s\x00%s", kind, realm, value)
	return hex.EncodeToString(mac.Sum(nil))
}
func (g *Guard) allowRequest(ctx context.Context, key string, rule ratelimit.Rule) error {
	decision, err := g.limiter.Allow(ctx, key, rule)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	if !decision.Allowed {
		return &Limited{RetryAfter: decision.RetryAfter}
	}
	return nil
}

// Check accepts an IP supplied by the authenticated app server only when that app has a trusted ingress header.
// When the IT allow-list is configured an absent or invalid client IP is always denied.
func (g *Guard) Check(ctx context.Context, realm authn.Realm, email, clientIP string) error {
	if realm != authn.RealmStaff && realm != authn.RealmCustomer && realm != authn.RealmIT {
		return ErrDenied
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return ErrDenied
	}
	var ip netip.Addr
	if clientIP != "" {
		var err error
		ip, err = netip.ParseAddr(clientIP)
		if err != nil {
			return ErrDenied
		}
		ip = ip.WithZone("").Unmap()
	}
	if realm == authn.RealmIT && len(g.allow) > 0 {
		permitted := false
		for _, prefix := range g.allow {
			if ip.IsValid() && prefix.Contains(ip) {
				permitted = true
				break
			}
		}
		if !permitted {
			return ErrDenied
		}
	}
	if ip.IsValid() {
		if err := g.allowRequest(ctx, g.digest("ip", realm, ip.String()), g.ip); err != nil {
			return err
		}
	}
	return g.allowRequest(ctx, g.digest("account", realm, email), g.account)
}
