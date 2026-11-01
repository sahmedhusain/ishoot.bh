// Package authntest issues real signed tokens for tests of services that verify them.
package authntest

import (
	"crypto/ed25519"
	"crypto/rand"
	"testing"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jwt"

	"platform.local/backend/pkg/authn"
)

// Issuer is the issuer name test tokens carry.
const Issuer = "https://identity.test"

// Signer signs tokens with a fresh Ed25519 key.
type Signer struct {
	KeyID   string
	Issuer  string
	private jwk.Key
	Public  jwk.Set
}

// NewServiceSigner returns a signer for a caller's own service tokens (ADR 0011).
func NewServiceSigner(t testing.TB, caller string) *Signer {
	t.Helper()
	s := NewSigner(t, caller+":1")
	s.Issuer = authn.ServiceIssuerPrefix + caller
	return s
}

// Trust returns the authn.Trust that accepts this signer's tokens.
func (s *Signer) Trust() authn.Trust {
	if s.Issuer != Issuer {
		return authn.Trust{Issuer: authn.ServiceIssuerPrefix, Keys: authn.StaticKeys{Set: s.Public}, Realms: []authn.Realm{authn.RealmService}}
	}
	return authn.Trust{Issuer: Issuer, Keys: authn.StaticKeys{Set: s.Public}, Realms: authn.UserRealms}
}

// NewSigner creates a key pair and its public JWKS.
func NewSigner(t testing.TB, keyID string) *Signer {
	t.Helper()
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	private, err := jwk.Import(priv)
	if err != nil {
		t.Fatal(err)
	}
	must(t, private.Set(jwk.KeyIDKey, keyID))
	must(t, private.Set(jwk.AlgorithmKey, jwa.EdDSA()))
	public, err := private.PublicKey()
	if err != nil {
		t.Fatal(err)
	}
	set := jwk.NewSet()
	must(t, set.AddKey(public))
	return &Signer{KeyID: keyID, Issuer: Issuer, private: private, Public: set}
}

// Token describes a test token. Zero values get sensible defaults.
type Token struct {
	Subject   string
	Realm     authn.Realm
	Roles     []string
	SessionID string
	Issuer    string
	TokenUse  string
	ExpiresIn time.Duration
}

// Sign returns a compact signed JWT.
func (s *Signer) Sign(t testing.TB, spec Token) string {
	t.Helper()
	if spec.Subject == "" {
		spec.Subject = "user-1"
	}
	if spec.Issuer == "" {
		spec.Issuer = s.Issuer
	}
	if spec.Realm == "" && s.Issuer != Issuer {
		spec.Realm = authn.RealmService
	}
	if spec.Realm == "" {
		spec.Realm = authn.RealmStaff
	}
	if spec.TokenUse == "" {
		spec.TokenUse = authn.TokenUseAccess
	}
	if spec.ExpiresIn == 0 {
		spec.ExpiresIn = 5 * time.Minute
	}
	now := time.Now()
	token, err := jwt.NewBuilder().
		Subject(spec.Subject).
		Issuer(spec.Issuer).
		Audience([]string{spec.Realm.Audience()}).
		IssuedAt(now).
		Expiration(now.Add(spec.ExpiresIn)).
		Claim(authn.ClaimRoles, spec.Roles).
		Claim(authn.ClaimSessionID, spec.SessionID).
		Claim(authn.ClaimTokenUse, spec.TokenUse).
		Build()
	if err != nil {
		t.Fatal(err)
	}
	signed, err := jwt.Sign(token, jwt.WithKey(jwa.EdDSA(), s.private))
	if err != nil {
		t.Fatal(err)
	}
	return string(signed)
}

func must(t testing.TB, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}
