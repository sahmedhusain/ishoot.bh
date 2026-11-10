package authn_test
import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
)
func encodedKey(t *testing.T, kid string) (string, jwk.Set) {
	t.Helper()
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	key, err := jwk.Import(priv)
	require.NoError(t, err)
	require.NoError(t, key.Set(jwk.KeyIDKey, kid))
	raw, err := json.Marshal(key)
	require.NoError(t, err)
	public, err := key.PublicKey()
	require.NoError(t, err)
	require.NoError(t, public.Set(jwk.AlgorithmKey, jwa.EdDSA()))
	set := jwk.NewSet()
	require.NoError(t, set.AddKey(public))
	return base64.RawURLEncoding.EncodeToString(raw), set
}
func TestServiceSigner(t *testing.T) {
	encoded, public := encodedKey(t, "notify:abc")
	signer, err := authn.NewServiceSigner("notify", encoded, time.Minute)
	require.NoError(t, err)
	token, err := signer.Token()
	require.NoError(t, err)
	again, err := signer.Token()
	require.NoError(t, err)
	assert.Equal(t, token, again, "reused until close to expiry")
	verifier := authn.NewVerifier(time.Second, authn.Trust{Issuer: authn.ServiceIssuerPrefix, Keys: authn.StaticKeys{Set: public},
		Realms:	[]authn.Realm{authn.RealmService}})
	p, err := verifier.Verify(context.Background(), token, authn.RealmService)
	require.NoError(t, err)
	assert.Equal(t, "notify", p.Subject)
	assert.Equal(t, authn.RealmService, p.Realm)
	_, err = authn.NewServiceSigner("system", encoded, time.Minute)
	assert.Error(t, err, "a key belongs to one caller")
	_, err = authn.NewServiceSigner("notify", "", time.Minute)
	assert.Error(t, err)
}
