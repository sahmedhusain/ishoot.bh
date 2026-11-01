package tokens

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestLoadIssuerKeys(t *testing.T) {
	public, private, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	encode := func(v any) string {
		b, err := json.Marshal(v)
		require.NoError(t, err)
		return base64.RawURLEncoding.EncodeToString(b)
	}
	active := map[string]string{"kty": "OKP", "crv": "Ed25519", "kid": "current", "alg": "EdDSA", "x": base64.RawURLEncoding.EncodeToString(public), "d": base64.RawURLEncoding.EncodeToString(private.Seed())}
	cfg := Config{Issuer: "issuer", AccessTTL: time.Minute, SigningJWK: encode(active)}
	_, err = cfg.LoadIssuer()
	require.NoError(t, err)
	other, _, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	active["x"] = base64.RawURLEncoding.EncodeToString(other)
	cfg.SigningJWK = encode(active)
	_, err = cfg.LoadIssuer()
	require.Error(t, err)
	active["x"] = base64.RawURLEncoding.EncodeToString(public)
	cfg.SigningJWK = encode(active)
	cfg.PreviousJWKS = encode(map[string]any{"keys": []any{active}})
	_, err = cfg.LoadIssuer()
	require.Error(t, err, "never accept private keys in the public rotation set")
	delete(active, "d")
	active["kid"] = "old"
	cfg.PreviousJWKS = encode(map[string]any{"keys": []any{active}})
	_, err = cfg.LoadIssuer()
	require.NoError(t, err)
}
