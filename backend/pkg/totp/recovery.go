package totp

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

// RecoveryHash matches the existing app's lowercase 16-byte hexadecimal recovery codes and SHA-256 hashes.
func RecoveryHash(code string) (string, bool) {
	if len(code) != 32 {
		return "", false
	}
	for _, c := range code {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') {
			return "", false
		}
	}
	sum := sha256.Sum256([]byte(code))
	return hex.EncodeToString(sum[:]), true
}

// NewRecoveryCodes returns one-time plaintext codes and their storage hashes. Callers must never log plaintext codes.
func NewRecoveryCodes(count int) ([]string, []string, error) {
	if count < 1 || count > 64 {
		return nil, nil, errors.New("invalid recovery-code count")
	}
	codes := make([]string, 0, count)
	hashes := make([]string, 0, count)
	seen := make(map[string]bool, count)
	for len(codes) < count {
		var data [16]byte
		if _, err := rand.Read(data[:]); err != nil {
			return nil, nil, err
		}
		code := hex.EncodeToString(data[:])
		if seen[code] {
			continue
		}
		seen[code] = true
		hash, _ := RecoveryHash(code)
		codes = append(codes, code)
		hashes = append(hashes, hash)
	}
	return codes, hashes, nil
}
