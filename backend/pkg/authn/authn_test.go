package authn_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwt"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
)

func verifier(signers ...*authntest.Signer) *authn.Verifier {
	trusts := make([]authn.Trust, 0, len(signers))
	for _, s := range signers {
		trusts = append(trusts, s.Trust())
	}
	return authn.NewVerifier(time.Second, trusts...)
}

func TestVerifyAcceptsAValidToken(t *testing.T) {
	s := authntest.NewSigner(t, "k1")
	token := s.Sign(t, authntest.Token{Subject: "u42", Realm: authn.RealmIT, Roles: []string{"it_admin"}, SessionID: "s1"})

	p, err := verifier(s).Verify(context.Background(), token, authn.RealmIT)
	require.NoError(t, err)
	assert.Equal(t, "u42", p.Subject)
	assert.Equal(t, authn.RealmIT, p.Realm)
	assert.True(t, p.HasRole("it_admin"))
	assert.Equal(t, "s1", p.SessionID)
}

func TestVerifyRejects(t *testing.T) {
	s := authntest.NewSigner(t, "k1")
	other := authntest.NewSigner(t, "k1")
	tests := map[string]string{
		"empty":           "",
		"garbage":         "not.a.token",
		"wrong realm":     s.Sign(t, authntest.Token{Realm: authn.RealmCustomer}),
		"wrong issuer":    s.Sign(t, authntest.Token{Issuer: "https://evil.test"}),
		"expired":         s.Sign(t, authntest.Token{ExpiresIn: -time.Minute}),
		"refresh token":   s.Sign(t, authntest.Token{TokenUse: "refresh"}),
		"foreign key":     other.Sign(t, authntest.Token{}),
		"unsigned (none)": unsignedToken(t),
	}
	for name, token := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := verifier(s).Verify(context.Background(), token, authn.RealmStaff)
			assert.Error(t, err)
		})
	}
}

func unsignedToken(t *testing.T) string {
	tok, err := jwt.NewBuilder().Subject("u").Issuer(authntest.Issuer).Audience([]string{authn.RealmStaff.Audience()}).
		Expiration(time.Now().Add(time.Minute)).Claim(authn.ClaimTokenUse, authn.TokenUseAccess).Build()
	require.NoError(t, err)
	signed, err := jwt.Sign(tok, jwt.WithInsecureNoSignature())
	require.NoError(t, err)
	return string(signed)
}

func TestRemoteKeysCachesAndRefreshesOnRotation(t *testing.T) {
	first := authntest.NewSigner(t, "k1")
	second := authntest.NewSigner(t, "k2")
	var current atomic.Pointer[authntest.Signer]
	current.Store(first)
	var fetches atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		fetches.Add(1)
		_ = json.NewEncoder(w).Encode(current.Load().Public)
	}))
	defer srv.Close()

	keys := authn.NewRemoteKeys(srv.URL, srv.Client(), time.Hour, 0)
	v := authn.NewVerifier(time.Second, authn.Trust{Issuer: authntest.Issuer, Keys: keys, Realms: authn.UserRealms})

	for range 3 {
		_, err := v.Verify(context.Background(), first.Sign(t, authntest.Token{}), authn.RealmStaff)
		require.NoError(t, err)
	}
	assert.Equal(t, int32(1), fetches.Load(), "the key set is cached")

	current.Store(second)
	_, err := v.Verify(context.Background(), second.Sign(t, authntest.Token{}), authn.RealmStaff)
	require.NoError(t, err, "an unknown key ID triggers a refresh")
	assert.Equal(t, int32(2), fetches.Load())
}

func TestRemoteKeysKeepsCachedSetWhenRefreshFails(t *testing.T) {
	s := authntest.NewSigner(t, "k1")
	healthy := atomic.Bool{}
	healthy.Store(true)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if !healthy.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		_ = json.NewEncoder(w).Encode(s.Public)
	}))
	defer srv.Close()

	keys := authn.NewRemoteKeys(srv.URL, srv.Client(), time.Nanosecond, 0)
	_, err := keys.Keys(context.Background())
	require.NoError(t, err)
	healthy.Store(false)
	set, err := keys.Keys(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 1, set.Len())
}

func TestBearerToken(t *testing.T) {
	assert.Equal(t, "abc", authn.BearerToken("Bearer abc"))
	assert.Equal(t, "abc", authn.BearerToken("bearer abc"))
	assert.Empty(t, authn.BearerToken("Basic abc"))
	assert.Empty(t, authn.BearerToken("abc"))
}

func TestParseRealm(t *testing.T) {
	realm, err := authn.ParseRealm("it")
	require.NoError(t, err)
	assert.Equal(t, "platform:it", realm.Audience())
	_, err = authn.ParseRealm("root")
	assert.Error(t, err)
}

func TestServiceTokens(t *testing.T) {
	user := authntest.NewSigner(t, "identity-1")
	admin := authntest.NewServiceSigner(t, "admin")
	v := verifier(user, admin)

	p, err := v.Verify(context.Background(), admin.Sign(t, authntest.Token{Subject: "admin"}), authn.RealmService)
	require.NoError(t, err)
	assert.Equal(t, authn.RealmService, p.Realm)
	assert.Equal(t, "admin", p.Subject)

	_, err = v.Verify(context.Background(), admin.Sign(t, authntest.Token{Realm: authn.RealmStaff}), authn.RealmStaff)
	assert.Error(t, err, "service keys cannot issue user tokens")

	_, err = v.Verify(context.Background(), user.Sign(t, authntest.Token{Realm: authn.RealmService}), authn.RealmService)
	assert.Error(t, err, "the identity service does not issue service tokens")

	_, err = v.Verify(context.Background(), admin.Sign(t, authntest.Token{Issuer: "service:web"}), authn.RealmService)
	assert.Error(t, err, "a caller cannot sign as another caller")

	_, err = v.Verify(context.Background(), admin.Sign(t, authntest.Token{Issuer: "https://other.test"}), authn.RealmService)
	assert.Error(t, err, "untrusted issuer")
}

func TestVerifierFromConfig(t *testing.T) {
	admin := authntest.NewServiceSigner(t, "admin")
	body, err := json.Marshal(admin.Public)
	require.NoError(t, err)
	file := filepath.Join(t.TempDir(), "keys.json")
	require.NoError(t, os.WriteFile(file, body, 0o600))

	cfg := authn.Config{ServiceKeysFile: file, ClockSkew: time.Second}
	assert.True(t, cfg.Configured())
	v, err := authn.NewVerifierFromConfig(cfg)
	require.NoError(t, err)
	_, err = v.Verify(context.Background(), admin.Sign(t, authntest.Token{Subject: "admin"}), authn.RealmService)
	require.NoError(t, err)

	_, err = authn.NewVerifierFromConfig(authn.Config{Issuer: "https://identity.test"})
	assert.Error(t, err, "issuer without JWKS URL")
	assert.False(t, authn.Config{}.Configured())
}
