package tokens

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"testing"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
)

func TestIssuerRealmAndPublicKeys(t *testing.T) {
	_, private, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	issuer, err := New("https://identity.example", "key-1", private, 10*time.Minute)
	require.NoError(t, err)
	data := issuer.JWKS()
	var body map[string]any
	require.NoError(t, json.Unmarshal(data, &body))
	require.NotContains(t, string(data), `"d"`)
	set, err := jwk.Parse(data)
	require.NoError(t, err)
	verifier := authn.NewVerifier(0, authn.Trust{Issuer: "https://identity.example", Keys: authn.StaticKeys{Set: set}, Realms: authn.UserRealms})
	now := time.Now().UTC().Truncate(time.Second)
	for _, realm := range []authn.Realm{authn.RealmStaff, authn.RealmCustomer, authn.RealmIT} {
		token, err := issuer.Sign("subject", "session", realm, []string{"reader"}, now, now.Add(time.Minute))
		require.NoError(t, err)
		principal, err := verifier.Verify(context.Background(), token, realm)
		require.NoError(t, err)
		require.Equal(t, realm, principal.Realm)
		require.Equal(t, "session", principal.SessionID)
		require.True(t, principal.ExpiresAt.Equal(now.Add(time.Minute)))
		for _, other := range []authn.Realm{authn.RealmStaff, authn.RealmCustomer, authn.RealmIT, authn.RealmService} {
			if realm != other {
				_, err = verifier.Verify(context.Background(), token, other)
				require.Error(t, err)
			}
		}
	}
	_, err = issuer.Sign("subject", "session", authn.RealmService, nil, now, now.Add(time.Hour))
	require.Error(t, err)
	_, err = issuer.Sign("subject", "session", authn.RealmIT, nil, now, now)
	require.Error(t, err)
	data[0] = 'x'
	require.NotEqual(t, data, issuer.JWKS())
}

func TestRejectsInvalidSigningConfiguration(t *testing.T) {
	_, private, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	_, err = New("", "kid", private, time.Minute)
	require.Error(t, err)
	_, err = New("issuer", "", private, time.Minute)
	require.Error(t, err)
	_, err = New("issuer", "kid", private, 0)
	require.Error(t, err)
	_, err = New("issuer", "kid", private[:10], time.Minute)
	require.Error(t, err)
	corrupt := append(ed25519.PrivateKey(nil), private...)
	corrupt[63] ^= 1
	_, err = New("issuer", "kid", corrupt, time.Minute)
	require.Error(t, err)
}
