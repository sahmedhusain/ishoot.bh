package secrets
import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/hex"
	"strings"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
var (
	keyA	= strings.Repeat("a", KeySize)
	keyB	= strings.Repeat("b", KeySize)
)
func b64(s string) string	{ return base64.StdEncoding.EncodeToString([]byte(s)) }
func ring(t *testing.T, primary string) *Keyring {
	t.Helper()
	k, err := NewKeyring(Config{
		Keys:			[]string{"2026a:" + b64(keyA), "2026b:" + b64(keyB)},
		PrimaryKeyID:		primary,
		LegacyIntegrationKey:	keyA,
		LegacyMFAKey:		b64(keyB),
	})
	require.NoError(t, err)
	return k
}
func TestSealAndOpen(t *testing.T) {
	k := ring(t, "2026a")
	sealed, err := k.Seal([]byte(`{"apiKey":"sk_test"}`), "integration:stripe")
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(sealed, "v1.2026a."))
	plain, err := k.Open(sealed, "integration:stripe")
	require.NoError(t, err)
	assert.Equal(t, `{"apiKey":"sk_test"}`, string(plain))
	_, err = k.Open(sealed, "integration:paypal")
	assert.ErrorIs(t, err, ErrDecrypt, "a value is bound to its context")
	tampered := sealed[:len(sealed)-2] + "AA"
	_, err = k.Open(tampered, "integration:stripe")
	assert.ErrorIs(t, err, ErrDecrypt)
}
func TestRotation(t *testing.T) {
	old := ring(t, "2026a")
	sealed, err := old.Seal([]byte("secret"), "mfa")
	require.NoError(t, err)
	rotated := ring(t, "2026b")
	assert.True(t, rotated.NeedsRotation(sealed))
	plain, err := rotated.Open(sealed, "mfa")
	require.NoError(t, err, "values sealed with an older key still open")
	assert.Equal(t, "secret", string(plain))
	resealed, err := rotated.Seal(plain, "mfa")
	require.NoError(t, err)
	assert.False(t, rotated.NeedsRotation(resealed))
}
func nodeStyle(t *testing.T, key, iv, plain, aad []byte) (tag, data []byte) {
	block, err := aes.NewCipher(key)
	require.NoError(t, err)
	aead, err := cipher.NewGCM(block)
	require.NoError(t, err)
	sealed := aead.Seal(nil, iv, plain, aad)
	return sealed[len(sealed)-aead.Overhead():], sealed[:len(sealed)-aead.Overhead()]
}
func TestOpensValuesWrittenByTheTypeScriptBackend(t *testing.T) {
	k := ring(t, "2026a")
	iv := []byte("123456789012")
	tag, data := nodeStyle(t, []byte(keyA), iv, []byte(`{"token":"x"}`), nil)
	integration := hex.EncodeToString(iv) + ":" + hex.EncodeToString(tag) + ":" + hex.EncodeToString(data)
	plain, err := k.Open(integration, "integration:any")
	require.NoError(t, err)
	assert.Equal(t, `{"token":"x"}`, string(plain))
	assert.True(t, k.NeedsRotation(integration))
	tag, data = nodeStyle(t, []byte(keyB), iv, []byte("JBSWY3DPEHPK3PXP"), []byte("user-123"))
	mfa := strings.Join([]string{base64.StdEncoding.EncodeToString(iv), base64.StdEncoding.EncodeToString(tag), base64.StdEncoding.EncodeToString(data)}, ".")
	require.Equal(t, "MTIzNDU2Nzg5MDEy.WAqUAxCQ3k3ssm1UH8s12w==.KMdZE+lMPbU7vI5DnqCbdg==", mfa)
	plain, err = k.Open(mfa, "user-123")
	require.NoError(t, err)
	assert.Equal(t, "JBSWY3DPEHPK3PXP", string(plain))
	_, err = k.Open(mfa, "different-user")
	require.ErrorIs(t, err, ErrDecrypt, "legacy MFA ciphertext must remain bound to its user ID")
}
func TestNewKeyringRejectsBadConfig(t *testing.T) {
	tests := map[string]Config{
		"primary missing":	{Keys: []string{"a:" + b64(keyA)}, PrimaryKeyID: "b"},
		"short key":		{Keys: []string{"a:" + b64("short")}, PrimaryKeyID: "a"},
		"no separator":		{Keys: []string{b64(keyA)}, PrimaryKeyID: "a"},
		"duplicate":		{Keys: []string{"a:" + b64(keyA), "a:" + b64(keyB)}, PrimaryKeyID: "a"},
		"bad legacy":		{Keys: []string{"a:" + b64(keyA)}, PrimaryKeyID: "a", LegacyIntegrationKey: "short"},
	}
	for name, cfg := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := NewKeyring(cfg)
			assert.Error(t, err)
		})
	}
}
