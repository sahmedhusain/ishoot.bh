package erasure
import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)
const MinKeyLength = 32
func EmailHash(key []byte, email string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(strings.ToLower(strings.TrimSpace(email))))
	return hex.EncodeToString(mac.Sum(nil))
}
