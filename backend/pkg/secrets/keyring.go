// Package secrets encrypts values stored at rest (integration credentials, MFA secrets) with AES-256-GCM under a
// key ring, so keys can be rotated without re-encrypting everything at once. It also reads the two formats the
// TypeScript backend wrote, so existing data keeps working after the move to Go.
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

// KeySize is the AES-256 key length in bytes.
const KeySize = 32

const (
	versionPrefix = "v1."
	nonceSize     = 12
)

// ErrDecrypt hides why a value could not be opened (wrong key, tampering, malformed input).
var ErrDecrypt = errors.New("secrets: cannot decrypt value")

// Config is embedded in a service config with envPrefix:"SECRETS_".
type Config struct {
	// Keys lists "keyID:base64key" pairs; PrimaryKeyID names the one new values are sealed with.
	Keys         []string `env:"KEYS" envSeparator:"," validate:"required,min=1"`
	PrimaryKeyID string   `env:"PRIMARY_KEY_ID" validate:"required"`
	// LegacyIntegrationKey is the old ENCRYPTION_KEY (32 raw characters) for "iv:tag:data" hex values.
	LegacyIntegrationKey string `env:"LEGACY_INTEGRATION_KEY"`
	// LegacyMFAKey is the old MFA_ENCRYPTION_KEY (base64) for "iv.tag.data" base64 values.
	LegacyMFAKey string `env:"LEGACY_MFA_KEY"`
}

// Keyring seals with the primary key and opens values sealed with any known key.
type Keyring struct {
	primary   string
	aeads     map[string]cipher.AEAD
	legacyHex cipher.AEAD
	legacyDot cipher.AEAD
}

// NewKeyring builds a key ring from configuration.
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

// Seal encrypts plaintext with the primary key. context binds the value to its use (e.g. "integration:stripe"),
// so a ciphertext copied into another field does not open.
func (k *Keyring) Seal(plaintext []byte, context string) (string, error) {
	nonce := make([]byte, nonceSize)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := k.aeads[k.primary].Seal(nonce, nonce, plaintext, []byte(context))
	return versionPrefix + k.primary + "." + base64.RawURLEncoding.EncodeToString(sealed), nil
}

// Open decrypts a value written by Seal or by the TypeScript backend.
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

// NeedsRotation reports whether value should be re-sealed: it uses a legacy format or a non-primary key.
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

// openLegacy opens [iv, tag, data] parts as Node wrote them. Legacy MFA binds the user ID as associated data.
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
