package routes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
)

var upstreams = map[string]string{"identity": "http://identity:8080", "itsm": "http://itsm:8080"}

const valid = `
defaultBodyLimit: 1M
rateLimits:
  default: { requests: 120, window: 1m }
  auth: { requests: 10, window: 1m, burst: 5 }
routes:
  - name: identity-public
    prefix: /v1/auth/
    upstream: identity
    realms: [public]
    rateLimit: auth
  - name: tickets
    prefix: /v1/tickets/
    upstream: itsm
    realms: [staff, it]
    stripPrefix: true
    rateLimit: default
    bodyLimit: 11M
`

func TestParseValidTable(t *testing.T) {
	table, err := Parse([]byte(valid), upstreams)
	require.NoError(t, err)
	require.Len(t, table.Routes, 2)
	assert.True(t, table.Routes[0].IsPublic())
	assert.Equal(t, []authn.Realm{authn.RealmStaff, authn.RealmIT}, table.Routes[1].AuthRealms())
	assert.True(t, table.NeedsAuth())
	rule := table.Rule(table.Routes[0])
	assert.Equal(t, 10, rule.Requests)
	assert.Equal(t, time.Minute, rule.Window)
	assert.Equal(t, 5, rule.Burst)
	assert.Equal(t, "1M", table.BodyLimit(table.Routes[0]))
	assert.Equal(t, "11M", table.BodyLimit(table.Routes[1]))
}

func TestParseRejectsMistakes(t *testing.T) {
	route := func(body string) string {
		return "defaultBodyLimit: 1M\nrateLimits:\n  default: { requests: 1, window: 1s }\nroutes:\n" + body
	}
	tests := map[string]string{
		"unknown field":      "routes:\n  - name: a\n    prefx: /a/\n",
		"bad prefix":         route("  - { name: a, prefix: /a, upstream: identity, realms: [public], rateLimit: default }\n"),
		"wildcard prefix":    route("  - { name: a, prefix: /a/*/, upstream: identity, realms: [public], rateLimit: default }\n"),
		"unknown upstream":   route("  - { name: a, prefix: /a/, upstream: nowhere, realms: [public], rateLimit: default }\n"),
		"no realms":          route("  - { name: a, prefix: /a/, upstream: identity, rateLimit: default }\n"),
		"unknown realm":      route("  - { name: a, prefix: /a/, upstream: identity, realms: [root], rateLimit: default }\n"),
		"public plus realm":  route("  - { name: a, prefix: /a/, upstream: identity, realms: [public, staff], rateLimit: default }\n"),
		"no rate limit":      route("  - { name: a, prefix: /a/, upstream: identity, realms: [public] }\n"),
		"unknown rate limit": route("  - { name: a, prefix: /a/, upstream: identity, realms: [public], rateLimit: other }\n"),
		"duplicate name":     route("  - { name: a, prefix: /a/, upstream: identity, realms: [public], rateLimit: default }\n  - { name: a, prefix: /b/, upstream: identity, realms: [public], rateLimit: default }\n"),
		"duplicate prefix":   route("  - { name: a, prefix: /a/, upstream: identity, realms: [public], rateLimit: default }\n  - { name: b, prefix: /a/, upstream: identity, realms: [public], rateLimit: default }\n"),
		"bad rule":           "defaultBodyLimit: 1M\nrateLimits:\n  default: { requests: 0, window: 1s }\nroutes: []\n",
		"no body limit":      "rateLimits:\n  default: { requests: 1, window: 1s }\nroutes: []\n",
		"bad body limit":     route("  - { name: a, prefix: /a/, upstream: identity, realms: [public], rateLimit: default, bodyLimit: lots }\n"),
	}
	for name, body := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := Parse([]byte(body), upstreams)
			assert.Error(t, err)
		})
	}
}
