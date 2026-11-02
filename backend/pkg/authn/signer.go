package authn

import (
	"encoding/base64"

	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jwt"
)

// ServiceSigner signs a backend service's own short-lived service tokens, so it can call another service the way the
// apps do (ADR 0011). The key is the base64url private JWK that `./run.sh env secrets` writes to <CALLER>_SERVICE_KEY;
// its public half is in the service keys file every service trusts.
type ServiceSigner struct {
	caller string
	key    jwk.Key
	ttl    time.Duration
	now    func() time.Time

	mu      sync.Mutex
	token   string
	renewAt time.Time
}

// NewServiceSigner parses the encoded key, whose key ID must start with "<caller>:".
func NewServiceSigner(caller, encoded string, ttl time.Duration) (*ServiceSigner, error) {
	if encoded == "" {
		return nil, fmt.Errorf("authn: the %s service key is not set (run ./run.sh env secrets)", caller)
	}
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(encoded, "="))
	if err != nil {
		return nil, fmt.Errorf("authn: %s service key: %w", caller, err)
	}
	key, err := jwk.ParseKey(raw)
	if err != nil {
		return nil, fmt.Errorf("authn: %s service key: %w", caller, err)
	}
	kid, _ := key.KeyID()
	if !strings.HasPrefix(kid, caller+":") {
		return nil, fmt.Errorf("authn: the %s service key's kid must start with %q", caller, caller+":")
	}
	if _, err := key.PublicKey(); err != nil {
		return nil, err
	}
	if err := key.Set(jwk.AlgorithmKey, jwa.EdDSA()); err != nil {
		return nil, err
	}
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	return &ServiceSigner{caller: caller, key: key, ttl: ttl, now: time.Now}, nil
}

// Token returns a token proving this service is the caller, reused until 80% of its lifetime has passed.
func (s *ServiceSigner) Token() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	if s.token != "" && now.Before(s.renewAt) {
		return s.token, nil
	}
	token, err := jwt.NewBuilder().
		Issuer(ServiceIssuerPrefix+s.caller).
		Subject(s.caller).
		Audience([]string{RealmService.Audience()}).
		IssuedAt(now).
		Expiration(now.Add(s.ttl)).
		Claim(ClaimTokenUse, TokenUseAccess).
		Build()
	if err != nil {
		return "", err
	}
	signed, err := jwt.Sign(token, jwt.WithKey(jwa.EdDSA(), s.key))
	if err != nil {
		return "", err
	}
	s.token, s.renewAt = string(signed), now.Add(s.ttl*8/10)
	return s.token, nil
}

// Transport adds the service token to every request sent through base (http.DefaultTransport when nil).
func (s *ServiceSigner) Transport(base http.RoundTripper) http.RoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return roundTripper(func(req *http.Request) (*http.Response, error) {
		token, err := s.Token()
		if err != nil {
			return nil, err
		}
		req = req.Clone(req.Context())
		req.Header.Set("Authorization", "Bearer "+token)
		return base.RoundTrip(req)
	})
}

type roundTripper func(*http.Request) (*http.Response, error)

func (f roundTripper) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }
