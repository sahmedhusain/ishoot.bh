package tokens
import (
	"crypto/ed25519"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"
)
type Config struct {
	Issuer		string		`env:"ISSUER"`
	SigningJWK	string		`env:"SIGNING_JWK"`
	PreviousJWKS	string		`env:"PREVIOUS_JWKS"`
	AccessTTL	time.Duration	`env:"ACCESS_TTL" envDefault:"10m" validate:"gt=0"`
}
type jsonKey struct {
	Kty	string	`json:"kty"`
	Crv	string	`json:"crv"`
	Kid	string	`json:"kid"`
	Alg	string	`json:"alg"`
	X	string	`json:"x"`
	D	string	`json:"d"`
}
func decodeJSON(encoded string, value any) error {
	if len(encoded) == 0 || len(encoded) > 65536 {
		return errors.New("invalid identity key configuration")
	}
	data, err := base64.RawURLEncoding.Strict().DecodeString(encoded)
	if err != nil {
		return errors.New("invalid identity key encoding")
	}
	if err = json.Unmarshal(data, value); err != nil {
		return errors.New("invalid identity key JSON")
	}
	return nil
}
func validJWK(k jsonKey) bool {
	return k.Kty == "OKP" && k.Crv == "Ed25519" && k.Kid != "" && (k.Alg == "" || k.Alg == "EdDSA")
}
func (c Config) LoadIssuer() (*Issuer, error) {
	var active jsonKey
	if err := decodeJSON(c.SigningJWK, &active); err != nil {
		return nil, err
	}
	if !validJWK(active) {
		return nil, errors.New("invalid identity signing JWK")
	}
	seed, err := base64.RawURLEncoding.Strict().DecodeString(active.D)
	if err != nil || len(seed) != ed25519.SeedSize {
		return nil, errors.New("invalid identity signing seed")
	}
	public, err := base64.RawURLEncoding.Strict().DecodeString(active.X)
	if err != nil || len(public) != ed25519.PublicKeySize {
		return nil, errors.New("invalid identity public key")
	}
	private := ed25519.NewKeyFromSeed(seed)
	if subtle.ConstantTimeCompare(private[ed25519.SeedSize:], public) != 1 {
		return nil, errors.New("identity signing key does not match public key")
	}
	var previous []PublicKey
	if c.PreviousJWKS != "" {
		var set struct {
			Keys []jsonKey `json:"keys"`
		}
		if err := decodeJSON(c.PreviousJWKS, &set); err != nil {
			return nil, err
		}
		if len(set.Keys) == 0 || len(set.Keys) > 32 {
			return nil, errors.New("invalid previous identity key set")
		}
		for _, key := range set.Keys {
			if !validJWK(key) || key.D != "" {
				return nil, errors.New("previous identity keys must be public Ed25519 keys")
			}
			raw, err := base64.RawURLEncoding.Strict().DecodeString(key.X)
			if err != nil || len(raw) != ed25519.PublicKeySize {
				return nil, errors.New("invalid previous identity key")
			}
			previous = append(previous, PublicKey{ID: key.Kid, Key: ed25519.PublicKey(raw)})
		}
	}
	return NewWithPrevious(c.Issuer, active.Kid, private, c.AccessTTL, previous)
}
