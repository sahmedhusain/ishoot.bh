// Package tokens issues short-lived identity access tokens using an Ed25519 key.
package tokens

import (
	"crypto/ed25519"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jwt"

	"platform.local/backend/pkg/authn"
)

// Issuer holds one active private key and publishes only its public key.
type Issuer struct {
	issuer string
	ttl    time.Duration
	key    jwk.Key
	public []byte
}

func New(issuer, kid string, private ed25519.PrivateKey, ttl time.Duration) (*Issuer, error) {
	if issuer == "" || kid == "" || len(private) != ed25519.PrivateKeySize || ttl <= 0 {
		return nil, errors.New("invalid identity signing configuration")
	}
	derived := ed25519.NewKeyFromSeed(private[:ed25519.SeedSize])
	if subtle.ConstantTimeCompare(derived, private) != 1 {
		return nil, errors.New("invalid identity signing key")
	}
	key, err := jwk.Import(derived)
	if err != nil {
		return nil, err
	}
	if err = key.Set(jwk.KeyIDKey, kid); err != nil {
		return nil, err
	}
	if err = key.Set(jwk.AlgorithmKey, jwa.EdDSA()); err != nil {
		return nil, err
	}
	public, err := key.PublicKey()
	if err != nil {
		return nil, err
	}
	set := jwk.NewSet()
	if err = set.AddKey(public); err != nil {
		return nil, err
	}
	data, err := json.Marshal(set)
	if err != nil {
		return nil, err
	}
	return &Issuer{issuer: issuer, ttl: ttl, key: key, public: data}, nil
}

// JWKS returns a copy so callers cannot modify the published keys.
func (i *Issuer) JWKS() []byte { return append([]byte(nil), i.public...) }

// Sign issues a realm-specific access token for an already authenticated session.
func (i *Issuer) Sign(subject, session string, realm authn.Realm, roles []string, now, sessionExpiry time.Time) (string, error) {
	if subject == "" || session == "" || (realm != authn.RealmStaff && realm != authn.RealmCustomer && realm != authn.RealmIT) || !sessionExpiry.After(now) {
		return "", errors.New("invalid identity principal")
	}
	expiry := now.Add(i.ttl)
	if sessionExpiry.Before(expiry) {
		expiry = sessionExpiry
	}
	token, err := jwt.NewBuilder().Subject(subject).Issuer(i.issuer).Audience([]string{realm.Audience()}).IssuedAt(now).Expiration(expiry).Claim(authn.ClaimRoles, roles).Claim(authn.ClaimSessionID, session).Claim(authn.ClaimTokenUse, authn.TokenUseAccess).Build()
	if err != nil {
		return "", err
	}
	signed, err := jwt.Sign(token, jwt.WithKey(jwa.EdDSA(), i.key))
	if err != nil {
		return "", err
	}
	return string(signed), nil
}
