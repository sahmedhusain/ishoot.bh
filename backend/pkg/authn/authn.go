// Package authn verifies the access tokens issued by the identity service and carries the signed-in principal
// through the request. Tokens are EdDSA JWTs; the public keys come from identity's JWKS endpoint.
package authn

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jws"
	"github.com/lestrrat-go/jwx/v3/jwt"
)

// Realm separates the account populations (ADR 0005). A token is only accepted by routes of its own realm.
type Realm string

// The realms. Service is for calls between backend services.
const (
	RealmStaff    Realm = "staff"
	RealmCustomer Realm = "customer"
	RealmIT       Realm = "it"
	RealmService  Realm = "service"
)

// Realms lists every realm.
var Realms = []Realm{RealmStaff, RealmCustomer, RealmIT, RealmService}

// ParseRealm validates a realm name.
func ParseRealm(name string) (Realm, error) {
	realm := Realm(name)
	if slices.Contains(Realms, realm) {
		return realm, nil
	}
	return "", fmt.Errorf("authn: unknown realm %q", name)
}

// Audience is the token audience of a realm, e.g. "platform:staff".
func (r Realm) Audience() string { return AudiencePrefix + string(r) }

// AudiencePrefix namespaces realm audiences.
const AudiencePrefix = "platform:"

// Claim names beyond the registered JWT claims.
const (
	ClaimRoles     = "roles"
	ClaimSessionID = "sid"
	ClaimTokenUse  = "token_use"
	TokenUseAccess = "access"
)

// Principal is the authenticated caller.
type Principal struct {
	Subject   string
	Realm     Realm
	Roles     []string
	SessionID string
	ExpiresAt time.Time
}

// HasRole reports whether the principal holds role.
func (p Principal) HasRole(role string) bool { return slices.Contains(p.Roles, role) }

// Errors returned by Verify. Callers map both to 401 without detail.
var (
	ErrMissingToken = errors.New("authn: missing token")
	ErrInvalidToken = errors.New("authn: invalid token")
)

// Verifier checks access tokens against the identity service's keys.
type Verifier struct {
	keys   KeySource
	issuer string
	skew   time.Duration
	now    func() time.Time
}

// NewVerifier returns a verifier accepting tokens from issuer, allowing skew of clock difference.
func NewVerifier(keys KeySource, issuer string, skew time.Duration) *Verifier {
	return &Verifier{keys: keys, issuer: issuer, skew: skew, now: time.Now}
}

// Verify parses and validates token for one of the allowed realms and returns its principal.
func (v *Verifier) Verify(ctx context.Context, token string, allowed ...Realm) (Principal, error) {
	if token == "" {
		return Principal{}, ErrMissingToken
	}
	kid, err := checkHeader(token)
	if err != nil {
		return Principal{}, err
	}
	set, err := v.keys.Keys(ctx)
	if err != nil {
		return Principal{}, fmt.Errorf("authn: loading keys: %w", err)
	}
	if _, known := set.LookupKeyID(kid); !known {
		// The identity service may have rotated its keys since the set was cached.
		v.keys.Invalidate()
		if set, err = v.keys.Keys(ctx); err != nil {
			return Principal{}, fmt.Errorf("authn: loading keys: %w", err)
		}
	}
	parsed, err := jwt.ParseString(token,
		jwt.WithKeySet(set, jws.WithRequireKid(true), jws.WithInferAlgorithmFromKey(false)),
		jwt.WithIssuer(v.issuer),
		jwt.WithAcceptableSkew(v.skew),
		jwt.WithClock(jwt.ClockFunc(v.now)),
		jwt.WithRequiredClaim(jwt.SubjectKey),
		jwt.WithRequiredClaim(jwt.ExpirationKey),
	)
	if err != nil {
		return Principal{}, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}

	var use string
	if err := parsed.Get(ClaimTokenUse, &use); err != nil || use != TokenUseAccess {
		return Principal{}, fmt.Errorf("%w: not an access token", ErrInvalidToken)
	}
	realm, ok := realmFromAudience(parsed, allowed)
	if !ok {
		return Principal{}, fmt.Errorf("%w: wrong audience", ErrInvalidToken)
	}

	subject, _ := parsed.Subject()
	expires, _ := parsed.Expiration()
	principal := Principal{Subject: subject, Realm: realm, ExpiresAt: expires}
	principal.Roles = stringList(parsed, ClaimRoles)
	_ = parsed.Get(ClaimSessionID, &principal.SessionID)
	return principal, nil
}

// checkHeader refuses any token not signed with EdDSA, whatever the key set contains, and returns its key ID.
func checkHeader(token string) (string, error) {
	msg, err := jws.ParseString(token)
	if err != nil || len(msg.Signatures()) != 1 {
		return "", fmt.Errorf("%w: malformed signature", ErrInvalidToken)
	}
	headers := msg.Signatures()[0].ProtectedHeaders()
	alg, ok := headers.Algorithm()
	if !ok || alg != jwa.EdDSA() {
		return "", fmt.Errorf("%w: algorithm not allowed", ErrInvalidToken)
	}
	kid, ok := headers.KeyID()
	if !ok || kid == "" {
		return "", fmt.Errorf("%w: missing key id", ErrInvalidToken)
	}
	return kid, nil
}

func realmFromAudience(token jwt.Token, allowed []Realm) (Realm, bool) {
	audiences, _ := token.Audience()
	for _, realm := range allowed {
		if slices.Contains(audiences, realm.Audience()) {
			return realm, true
		}
	}
	return "", false
}

// stringList reads a claim holding a JSON array of strings.
func stringList(token jwt.Token, name string) []string {
	var raw []any
	if err := token.Get(name, &raw); err != nil {
		return nil
	}
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

type principalKey struct{}

// WithPrincipal stores the principal in ctx.
func WithPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, principalKey{}, p)
}

// PrincipalFrom returns the principal stored in ctx, if any.
func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey{}).(Principal)
	return p, ok
}
