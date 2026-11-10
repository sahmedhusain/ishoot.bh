package oauth_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/identity/internal/oauth"
)

func TestNew(t *testing.T) {
	p := oauth.New()
	require.NotNil(t, p)
}

func TestAuthorizationURL(t *testing.T) {
	googleValues := map[string]string{
		"clientId": "google-client-id-123",
	}

	appleValues := map[string]string{
		"serviceId": "apple-service-id-456",
	}

	// Google URL
	gURLStr, err := oauth.AuthorizationURL("google", googleValues, "http://localhost/callback", "state123", "nonce123", "verifier123", "en")
	require.NoError(t, err)
	assert.Contains(t, gURLStr, "https://accounts.google.com/o/oauth2/v2/auth")
	gParsed, err := url.Parse(gURLStr)
	require.NoError(t, err)
	assert.Equal(t, "google-client-id-123", gParsed.Query().Get("client_id"))
	assert.Equal(t, "select_account", gParsed.Query().Get("prompt"))
	assert.Equal(t, "en", gParsed.Query().Get("hl"))
	assert.Equal(t, "S256", gParsed.Query().Get("code_challenge_method"))

	// Apple URL
	aURLStr, err := oauth.AuthorizationURL("apple", appleValues, "http://localhost/callback", "state123", "nonce123", "verifier123", "en")
	require.NoError(t, err)
	assert.Contains(t, aURLStr, "https://appleid.apple.com/auth/authorize")
	aParsed, err := url.Parse(aURLStr)
	require.NoError(t, err)
	assert.Equal(t, "apple-service-id-456", aParsed.Query().Get("client_id"))
	assert.Equal(t, "form_post", aParsed.Query().Get("response_mode"))

	// Invalid / Missing inputs
	invalidCases := []struct {
		name     string
		provider string
		values   map[string]string
		state    string
		nonce    string
		verifier string
	}{
		{"missing id", "google", map[string]string{}, "state", "nonce", "verifier"},
		{"missing state", "google", googleValues, "", "nonce", "verifier"},
		{"missing nonce", "google", googleValues, "state", "", "verifier"},
		{"missing verifier", "google", googleValues, "state", "nonce", ""},
		{"unknown provider", "facebook", googleValues, "state", "nonce", "verifier"},
	}

	for _, tc := range invalidCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := oauth.AuthorizationURL(tc.provider, tc.values, "http://localhost/callback", tc.state, tc.nonce, tc.verifier, "en")
			assert.ErrorIs(t, err, oauth.ErrRejected)
		})
	}
}

func generateECDSAP256PEM(t *testing.T) string {
	t.Helper()
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	der, err := x509.MarshalPKCS8PrivateKey(priv)
	require.NoError(t, err)

	block := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: der,
	}
	return string(pem.EncodeToMemory(block))
}

func TestExchangeValidation(t *testing.T) {
	p := oauth.New()
	ctx := context.Background()

	validKeyPEM := generateECDSAP256PEM(t)

	invalidCases := []struct {
		name     string
		provider string
		values   map[string]string
		code     string
		verifier string
		nonce    string
	}{
		{"invalid provider", "facebook", map[string]string{"clientId": "c1"}, "code", "ver", "non"},
		{"empty code", "google", map[string]string{"clientId": "c1"}, "", "ver", "non"},
		{"empty verifier", "google", map[string]string{"clientId": "c1"}, "code", "", "non"},
		{"empty nonce", "google", map[string]string{"clientId": "c1"}, "code", "ver", ""},
		{"too long code", "google", map[string]string{"clientId": "c1"}, string(make([]byte, 8193)), "ver", "non"},
		{"missing google client secret", "google", map[string]string{"clientId": "c1"}, "code", "ver", "non"},
		{"missing apple private key", "apple", map[string]string{"serviceId": "s1", "keyId": "k1", "teamId": "t1"}, "code", "ver", "non"},
		{"invalid apple private key", "apple", map[string]string{"serviceId": "s1", "keyId": "k1", "teamId": "t1", "privateKey": "invalid"}, "code", "ver", "non"},
	}

	for _, tc := range invalidCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := p.Exchange(ctx, tc.provider, tc.values, tc.code, tc.verifier, "http://localhost/cb", tc.nonce)
			assert.ErrorIs(t, err, oauth.ErrRejected)
		})
	}

	// Apple exchange with valid PKCS8 key but invalid network endpoint returns ErrRejected
	appleValues := map[string]string{
		"serviceId":  "s1",
		"keyId":      "k1",
		"teamId":     "t1",
		"privateKey": validKeyPEM,
	}
	_, err := p.Exchange(ctx, "apple", appleValues, "valid_code", "verifier", "http://localhost/cb", "nonce")
	assert.ErrorIs(t, err, oauth.ErrRejected)
}
