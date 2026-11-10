package secrets
import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)
const KeySize = 32
const (
	versionPrefix	= "v1."
	nonceSize	= 12
)
var ErrDecrypt = errors.New("secrets: cannot decrypt value")
type Config struct {
	Keys		[]string	`env:"KEYS" envSeparator:"," validate:"required,min=1"`
	PrimaryKeyID	string		`env:"PRIMARY_KEY_ID" validate:"required"`
	LegacyIntegrationKey	string	`env:"LEGACY_INTEGRATION_KEY"`
	LegacyMFAKey	string	`env:"LEGACY_MFA_KEY"`
}
type Keyring struct {
	primary		string
	aeads		map[string]cipher.AEAD
	legacyHex	cipher.AEAD
	legacyDot	cipher.AEAD
}
func NewKeyring(cfg Config) (*Keyring, error) {
	ring := &Keyring{primary: cfg.PrimaryKeyID, aeads: map[string]cipher.AEAD{}}
	for _, entry := range cfg.Keys {
		id, encoded, ok := strings.Cut(strings.TrimSpace(entry), ":")
		if !ok || id == "" || strings.ContainsAny(id, ".:") {
			return nil, fmt.Errorf("secrets: key entries must be keyID:base64key")
		}
		key, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			return nil, fmt.Errorf("secrets: key %q is not base64", id)
		}
		aead, err := newAEAD(key)
		if err != nil {
			return nil, fmt.Errorf("secrets: key %q: %w", id, err)
		}
		if _, dup := ring.aeads[id]; dup {
			return nil, fmt.Errorf("secrets: key %q listed twice", id)
		}
		ring.aeads[id] = aead
	}
	if _, ok := ring.aeads[cfg.PrimaryKeyID]; !ok {
		return nil, fmt.Errorf("secrets: primary key %q is not in the key list", cfg.PrimaryKeyID)
	}
	if cfg.LegacyIntegrationKey != "" {
		aead, err := newAEAD([]byte(cfg.LegacyIntegrationKey))
		if err != nil {
			return nil, fmt.Errorf("secrets: legacy integration key: %w", err)
		}
		ring.legacyHex = aead
	}
	if cfg.LegacyMFAKey != "" {
		key, err := base64.StdEncoding.DecodeString(cfg.LegacyMFAKey)
		if err != nil {
			return nil, fmt.Errorf("secrets: legacy MFA key is not base64")
		}
		aead, err := newAEAD(key)
		if err != nil {
			return nil, fmt.Errorf("secrets: legacy MFA key: %w", err)
		}
		ring.legacyDot = aead
	}
	return ring, nil
}
func newAEAD(key []byte) (cipher.AEAD, error) {
	if len(key) != KeySize {
		return nil, fmt.Errorf("key must be %d bytes, got %d", KeySize, len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}
func (k *Keyring) Seal(plaintext []byte, context string) (string, error) {
	nonce := make([]byte, nonceSize)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := k.aeads[k.primary].Seal(nonce, nonce, plaintext, []byte(context))
	return versionPrefix + k.primary + "." + base64.RawURLEncoding.EncodeToString(sealed), nil
}
func (k *Keyring) Open(value, context string) ([]byte, error) {
	switch {
	case strings.HasPrefix(value, versionPrefix):
		return k.openV1(strings.TrimPrefix(value, versionPrefix), context)
	case strings.Count(value, ":") == 2 && k.legacyHex != nil:
		return openLegacy(k.legacyHex, strings.Split(value, ":"), hex.DecodeString, nil)
	case strings.Count(value, ".") == 2 && k.legacyDot != nil:
		return openLegacy(k.legacyDot, strings.Split(value, "."), base64.StdEncoding.DecodeString, []byte(context))
	}
	return nil, ErrDecrypt
}
func (k *Keyring) NeedsRotation(value string) bool {
	return !strings.HasPrefix(value, versionPrefix+k.primary+".")
}
func (k *Keyring) openV1(rest, context string) ([]byte, error) {
	id, encoded, ok := strings.Cut(rest, ".")
	aead, known := k.aeads[id]
	if !ok || !known {
		return nil, ErrDecrypt
	}
	sealed, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil || len(sealed) < nonceSize+aead.Overhead() {
		return nil, ErrDecrypt
	}
	plain, err := aead.Open(nil, sealed[:nonceSize], sealed[nonceSize:], []byte(context))
	if err != nil {
		return nil, ErrDecrypt
	}
	return plain, nil
}
func openLegacy(aead cipher.AEAD, parts []string, decode func(string) ([]byte, error), aad []byte) ([]byte, error) {
	var raw [3][]byte
	for i, part := range parts {
		b, err := decode(part)
		if err != nil {
			return nil, ErrDecrypt
		}
		raw[i] = b
	}
	iv, tag, data := raw[0], raw[1], raw[2]
	if len(iv) != nonceSize || len(tag) != aead.Overhead() {
		return nil, ErrDecrypt
	}
	plain, err := aead.Open(nil, iv, append(data, tag...), aad)
	if err != nil {
		return nil, ErrDecrypt
	}
	return plain, nil
}
