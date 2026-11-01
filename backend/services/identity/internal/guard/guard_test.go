package guard

import (
	"context"
	"errors"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/ratelimit"
)

type limiter struct {
	keys []string
	fail bool
	deny bool
}

func (l *limiter) Allow(_ context.Context, key string, _ ratelimit.Rule) (ratelimit.Decision, error) {
	l.keys = append(l.keys, key)
	if l.fail {
		return ratelimit.Decision{}, errors.New("redis unavailable")
	}
	return ratelimit.Decision{Allowed: !l.deny, RetryAfter: time.Minute}, nil
}
func TestGuardIsolationAndFailClosed(t *testing.T) {
	l := &limiter{}
	rule := func(name string) ratelimit.Rule { return ratelimit.Rule{Name: name, Requests: 10, Window: time.Minute} }
	g, err := New(l, []byte(strings.Repeat("a", 32)), rule("account"), rule("ip"), []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8")})
	require.NoError(t, err)
	ctx := context.Background()
	require.NoError(t, g.Check(ctx, authn.RealmStaff, " Alice@Example.com ", "::ffff:10.1.2.3"))
	require.Len(t, l.keys, 2)
	require.NotContains(t, l.keys[1], "alice")
	require.NotContains(t, l.keys[0], "10.1.2.3")
	staff := l.keys[1]
	ipKey := l.keys[0]
	require.NoError(t, g.Check(ctx, authn.RealmStaff, "alice@example.com", "10.1.2.3"))
	require.Equal(t, ipKey, l.keys[2], "mapped and native IPv4 addresses share one limit")
	require.NoError(t, g.Check(ctx, authn.RealmStaff, "alice@example.com", "fe80::1%zone-a"))
	zoneKey := l.keys[4]
	require.NoError(t, g.Check(ctx, authn.RealmStaff, "alice@example.com", "fe80::1%zone-b"))
	require.Equal(t, zoneKey, l.keys[6], "IPv6 zones cannot bypass the IP limit")
	require.NoError(t, g.Check(ctx, authn.RealmCustomer, "alice@example.com", "10.1.2.3"))
	require.NotEqual(t, staff, l.keys[9])
	require.ErrorIs(t, g.Check(ctx, authn.RealmIT, "it@example.com", ""), ErrDenied)
	require.ErrorIs(t, g.Check(ctx, authn.RealmIT, "it@example.com", "192.0.2.5"), ErrDenied)
	require.ErrorIs(t, g.Check(ctx, authn.RealmIT, "it@example.com", "invalid"), ErrDenied)
	require.NoError(t, g.Check(ctx, authn.RealmIT, "it@example.com", "10.1.2.3"))
	l.fail = true
	require.ErrorContains(t, g.Check(ctx, authn.RealmStaff, "alice@example.com", ""), "rate limit unavailable")
	l.fail = false
	l.deny = true
	err = g.Check(ctx, authn.RealmStaff, "alice@example.com", "")
	var limited *Limited
	require.ErrorAs(t, err, &limited)
	require.Equal(t, time.Minute, limited.RetryAfter)
	_, err = New(l, []byte("short"), rule("account"), rule("ip"), nil)
	require.Error(t, err)
}
