// Package erasure holds what services share to honour a right-to-erasure request across service boundaries.
package erasure

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// MinKeyLength is the shortest ERASURE_HASH_KEY accepted.
const MinKeyLength = 32

// EmailHash identifies an e-mail address in an erasure event without revealing it: the hex HMAC-SHA256 of the
// address, trimmed and lower-cased, under a key that only the services share (ERASURE_HASH_KEY). A plain hash of an
// address can be recomputed by anyone who guesses it; this one cannot without the key.
func EmailHash(key []byte, email string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(strings.ToLower(strings.TrimSpace(email))))
	return hex.EncodeToString(mac.Sum(nil))
}
