package authn
import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jws"
	"github.com/lestrrat-go/jwx/v3/jwt"
)
type Realm string
const (
	RealmStaff	Realm	= "staff"
	RealmCustomer	Realm	= "customer"
	RealmIT		Realm	= "it"
	RealmService	Realm	= "service"
)
var Realms = []Realm{RealmStaff, RealmCustomer, RealmIT, RealmService}
func ParseRealm(name string) (Realm, error) {
	realm := Realm(name)
	if slices.Contains(Realms, realm) {
		return realm, nil
	}
	return "", fmt.Errorf("authn: unknown realm %q", name)
}
func (r Realm) Audience() string	{ return AudiencePrefix + string(r) }
const AudiencePrefix = "platform:"
const (
	ClaimRoles	= "roles"
	ClaimSessionID	= "sid"
	ClaimTokenUse	= "token_use"
	TokenUseAccess	= "access"
)
type Principal struct {
	Subject		string
	Realm		Realm
	Roles		[]string
	SessionID	string
	ExpiresAt	time.Time
}
func (p Principal) HasRole(role string) bool	{ return slices.Contains(p.Roles, role) }
var (
	ErrMissingToken	= errors.New("authn: missing token")
	ErrInvalidToken	= errors.New("authn: invalid token")
)
var UserRealms = []Realm{RealmStaff, RealmCustomer, RealmIT}
const ServiceIssuerPrefix = "service:"
type Trust struct {
	Issuer	string
	Keys	KeySource
	Realms	[]Realm
}
type Verifier struct {
	trusts	[]Trust
	skew	time.Duration
	now	func() time.Time
}
func NewVerifier(skew time.Duration, trusts ...Trust) *Verifier {
	return &Verifier{trusts: trusts, skew: skew, now: time.Now}
}
func (v *Verifier) Verify(ctx context.Context, token string, allowed ...Realm) (Principal, error) {
	if token == "" {
		return Principal{}, ErrMissingToken
	}
	kid, err := checkHeader(token)
	if err != nil {
		return Principal{}, err
	}
	issuer, trust, err := v.trustFor(token, kid)
	if err != nil {
		return Principal{}, err
	}
	set, err := trust.Keys.Keys(ctx)
	if err != nil {
		return Principal{}, fmt.Errorf("authn: loading keys: %w", err)
	}
	if _, known := set.LookupKeyID(kid); !known {
		trust.Keys.Invalidate()
		if set, err = trust.Keys.Keys(ctx); err != nil {
			return Principal{}, fmt.Errorf("authn: loading keys: %w", err)
		}
	}
	parsed, err := jwt.ParseString(token,
		jwt.WithKeySet(set, jws.WithRequireKid(true), jws.WithInferAlgorithmFromKey(false)),
		jwt.WithIssuer(issuer),
		jwt.WithAcceptableSkew(v.skew),
		jwt.WithClock(jwt.ClockFunc(v.now)),
		jwt.WithRequiredClaim(jwt.SubjectKey),
		jwt.WithRequiredClaim(jwt.ExpirationKey),
	)
	if err != nil {
		return Principal{}, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}
	allowed = slices.DeleteFunc(slices.Clone(allowed), func(r Realm) bool { return !slices.Contains(trust.Realms, r) })
	var use string
	if err := parsed.Get(ClaimTokenUse, &use); err != nil || use != TokenUseAccess {
		return Principal{}, fmt.Errorf("%w: not an access token", ErrInvalidToken)
	}
	realm, ok := realmFromAudience(parsed, allowed)
	if !ok {
		return Principal{}, fmt.Errorf("%w: wrong audience", ErrInvalidToken)
	}
	subject, _ := parsed.Subject()
	if subject == "" || (realm == RealmService && subject != strings.TrimPrefix(issuer, ServiceIssuerPrefix)) {
		return Principal{}, fmt.Errorf("%w: invalid subject", ErrInvalidToken)
	}
	expires, _ := parsed.Expiration()
	principal := Principal{Subject: subject, Realm: realm, ExpiresAt: expires}
	principal.Roles = stringList(parsed, ClaimRoles)
	_ = parsed.Get(ClaimSessionID, &principal.SessionID)
	return principal, nil
}
func (v *Verifier) trustFor(token, kid string) (string, Trust, error) {
	unverified, err := jwt.ParseInsecure([]byte(token))
	if err != nil {
		return "", Trust{}, fmt.Errorf("%w: malformed claims", ErrInvalidToken)
	}
	issuer, ok := unverified.Issuer()
	if !ok || issuer == "" {
		return "", Trust{}, fmt.Errorf("%w: missing issuer", ErrInvalidToken)
	}
	for _, trust := range v.trusts {
		if trust.Issuer == issuer && trust.Issuer != ServiceIssuerPrefix {
			return issuer, trust, nil
		}
		if trust.Issuer == ServiceIssuerPrefix && strings.HasPrefix(issuer, ServiceIssuerPrefix) {
			caller := strings.TrimPrefix(issuer, ServiceIssuerPrefix)
			if caller == "" || !strings.HasPrefix(kid, caller+":") {
				return "", Trust{}, fmt.Errorf("%w: key does not belong to the caller", ErrInvalidToken)
			}
			return issuer, trust, nil
		}
	}
	return "", Trust{}, fmt.Errorf("%w: untrusted issuer", ErrInvalidToken)
}
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
func WithPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, principalKey{}, p)
}
func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey{}).(Principal)
	return p, ok
}
