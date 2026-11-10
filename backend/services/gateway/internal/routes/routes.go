package routes
import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"
	"github.com/labstack/gommon/bytes"
	"go.yaml.in/yaml/v3"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/ratelimit"
)
const Public = "public"
type Table struct {
	DefaultBodyLimit	string			`yaml:"defaultBodyLimit"`
	RateLimits		map[string]RateLimit	`yaml:"rateLimits"`
	Routes			[]Route			`yaml:"routes"`
}
type RateLimit struct {
	Requests	int		`yaml:"requests"`
	Window		time.Duration	`yaml:"window"`
	Burst		int		`yaml:"burst"`
}
type Route struct {
	Name		string		`yaml:"name"`
	Prefix		string		`yaml:"prefix"`
	Upstream	string		`yaml:"upstream"`
	Realms		[]string	`yaml:"realms"`
	StripPrefix	bool		`yaml:"stripPrefix"`
	RateLimit	string		`yaml:"rateLimit"`
	BodyLimit	string		`yaml:"bodyLimit"`
}
func (t Table) BodyLimit(route Route) string {
	if route.BodyLimit != "" {
		return route.BodyLimit
	}
	return t.DefaultBodyLimit
}
func (r Route) IsPublic() bool	{ return slices.Contains(r.Realms, Public) }
func (r Route) AuthRealms() []authn.Realm {
	out := make([]authn.Realm, 0, len(r.Realms))
	for _, name := range r.Realms {
		if realm, err := authn.ParseRealm(name); err == nil {
			out = append(out, realm)
		}
	}
	return out
}
func (t Table) Rule(route Route) ratelimit.Rule {
	limit := t.RateLimits[route.RateLimit]
	return ratelimit.Rule{Name: route.RateLimit, Requests: limit.Requests, Window: limit.Window, Burst: limit.Burst}
}
func (t Table) NeedsAuth() bool {
	for _, r := range t.Routes {
		if !r.IsPublic() {
			return true
		}
	}
	return false
}
func Load(path string, upstreams map[string]string) (Table, error) {
	body, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		return Table{}, fmt.Errorf("routes: %w", err)
	}
	return Parse(body, upstreams)
}
func Parse(body []byte, upstreams map[string]string) (Table, error) {
	var table Table
	dec := yaml.NewDecoder(strings.NewReader(string(body)))
	dec.KnownFields(true)
	if err := dec.Decode(&table); err != nil {
		return Table{}, fmt.Errorf("routes: %w", err)
	}
	return table, table.validate(upstreams)
}
func (t Table) validate(upstreams map[string]string) error {
	if _, err := bytes.Parse(t.DefaultBodyLimit); err != nil || t.DefaultBodyLimit == "" {
		return fmt.Errorf("routes: defaultBodyLimit %q must be a size such as 1M", t.DefaultBodyLimit)
	}
	for name, limit := range t.RateLimits {
		rule := ratelimit.Rule{Name: name, Requests: limit.Requests, Window: limit.Window, Burst: limit.Burst}
		if err := rule.Validate(); err != nil {
			return fmt.Errorf("routes: rate limit %q: %w", name, err)
		}
	}
	names, prefixes := map[string]bool{}, map[string]bool{}
	for _, r := range t.Routes {
		switch {
		case r.Name == "" || names[r.Name]:
			return fmt.Errorf("routes: route names must be unique and not empty (%q)", r.Name)
		case !strings.HasPrefix(r.Prefix, "/") || !strings.HasSuffix(r.Prefix, "/") || strings.ContainsAny(r.Prefix, "*:") || strings.Contains(r.Prefix, ".."):
			return fmt.Errorf("routes: %s: prefix %q must start and end with / and contain no wildcards", r.Name, r.Prefix)
		case prefixes[r.Prefix]:
			return fmt.Errorf("routes: %s: prefix %q is used twice", r.Name, r.Prefix)
		case upstreams[r.Upstream] == "":
			return fmt.Errorf("routes: %s: upstream %q is not configured in GATEWAY_UPSTREAMS", r.Name, r.Upstream)
		case len(r.Realms) == 0:
			return fmt.Errorf("routes: %s: list the realms allowed (or %q)", r.Name, Public)
		case r.IsPublic() && len(r.Realms) > 1:
			return fmt.Errorf("routes: %s: a public route cannot also list realms", r.Name)
		case r.RateLimit == "":
			return fmt.Errorf("routes: %s: every route needs a rate limit", r.Name)
		}
		if _, err := bytes.Parse(t.BodyLimit(r)); err != nil {
			return fmt.Errorf("routes: %s: bodyLimit %q must be a size such as 11M", r.Name, r.BodyLimit)
		}
		if _, ok := t.RateLimits[r.RateLimit]; !ok {
			return fmt.Errorf("routes: %s: unknown rate limit %q", r.Name, r.RateLimit)
		}
		if !r.IsPublic() {
			for _, realm := range r.Realms {
				if _, err := authn.ParseRealm(realm); err != nil {
					return fmt.Errorf("routes: %s: %w", r.Name, err)
				}
			}
		}
		names[r.Name], prefixes[r.Prefix] = true, true
	}
	return nil
}
