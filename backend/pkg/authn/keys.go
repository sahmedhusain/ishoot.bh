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
type KeySource interface {
	Keys(ctx context.Context) (jwk.Set, error)
	Invalidate()
}
type StaticKeys struct{ Set jwk.Set }
func (s StaticKeys) Keys(context.Context) (jwk.Set, error)	{ return s.Set, nil }
func (StaticKeys) Invalidate()	{}
type RemoteKeys struct {
	url		string
	client		*http.Client
	ttl		time.Duration
	minRefresh	time.Duration
	maxBytes	int64
	mu		sync.Mutex
	set		jwk.Set
	fetchedAt	time.Time
	stale		bool
	now		func() time.Time
}
func NewRemoteKeys(url string, client *http.Client, ttl, minRefresh time.Duration) *RemoteKeys {
	return &RemoteKeys{url: url, client: client, ttl: ttl, minRefresh: minRefresh, maxBytes: 1 << 20, now: time.Now}
}
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
