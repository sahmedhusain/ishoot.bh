package authn

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwk"
)

// KeySource supplies the public keys tokens are checked against.
type KeySource interface {
	Keys(ctx context.Context) (jwk.Set, error)
	// Invalidate asks for a refresh on the next call (a token named a key the source does not know yet).
	Invalidate()
}

// StaticKeys is a fixed key set, used in tests and by the identity service for its own keys.
type StaticKeys struct{ Set jwk.Set }

// Keys returns the fixed set.
func (s StaticKeys) Keys(context.Context) (jwk.Set, error) { return s.Set, nil }

// Invalidate does nothing for a fixed set.
func (StaticKeys) Invalidate() {}

// RemoteKeys fetches a JWKS document over HTTP and caches it. It refreshes after ttl, or sooner when a token names
// an unknown key, but never more often than minRefresh so bad tokens cannot flood the identity service.
type RemoteKeys struct {
	url        string
	client     *http.Client
	ttl        time.Duration
	minRefresh time.Duration
	maxBytes   int64

	mu        sync.Mutex
	set       jwk.Set
	fetchedAt time.Time
	stale     bool
	now       func() time.Time
}

// NewRemoteKeys returns a cached JWKS source.
func NewRemoteKeys(url string, client *http.Client, ttl, minRefresh time.Duration) *RemoteKeys {
	return &RemoteKeys{url: url, client: client, ttl: ttl, minRefresh: minRefresh, maxBytes: 1 << 20, now: time.Now}
}

// Keys returns the cached set, fetching it when missing, expired or invalidated. If a refresh fails while a set
// is cached, the cached set keeps being used so a brief identity outage does not sign everyone out.
func (r *RemoteKeys) Keys(ctx context.Context) (jwk.Set, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	age := r.now().Sub(r.fetchedAt)
	due := r.set == nil || age >= r.ttl || (r.stale && age >= r.minRefresh)
	if !due {
		return r.set, nil
	}
	set, err := r.fetch(ctx)
	if err != nil {
		if r.set != nil {
			return r.set, nil
		}
		return nil, err
	}
	r.set, r.fetchedAt, r.stale = set, r.now(), false
	return set, nil
}

// Invalidate marks the cached set as possibly stale.
func (r *RemoteKeys) Invalidate() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.stale = true
}

func (r *RemoteKeys) fetch(ctx context.Context) (jwk.Set, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	res, err := r.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("authn: fetching JWKS: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("authn: fetching JWKS: status %d", res.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, r.maxBytes))
	if err != nil {
		return nil, fmt.Errorf("authn: reading JWKS: %w", err)
	}
	set, err := jwk.Parse(body)
	if err != nil {
		return nil, fmt.Errorf("authn: parsing JWKS: %w", err)
	}
	return set, nil
}
