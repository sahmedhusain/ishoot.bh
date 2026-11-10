package totp
import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"time"
)
type Config struct {
	Period	time.Duration	`env:"PERIOD" envDefault:"30s"`
	Digits	int		`env:"DIGITS" envDefault:"6"`
	Window	int		`env:"WINDOW" envDefault:"1"`
}
type Verifier struct {
	period		int64
	digits, window	int
}
func New(cfg Config) (*Verifier, error) {
	if cfg.Period < time.Second || cfg.Period%time.Second != 0 || (cfg.Digits != 6 && cfg.Digits != 8) || cfg.Window < 0 || cfg.Window > 2 {
		return nil, errors.New("invalid TOTP configuration")
	}
	return &Verifier{period: int64(cfg.Period / time.Second), digits: cfg.Digits, window: cfg.Window}, nil
}
func (v *Verifier) Code(secret []byte, step int64) (string, error) {
	if len(secret) == 0 || len(secret) > 128 || step < 0 {
		return "", errors.New("invalid TOTP secret or step")
	}
	var counter [8]byte
	binary.BigEndian.PutUint64(counter[:], uint64(step))
	mac := hmac.New(sha1.New, secret)
	_, _ = mac.Write(counter[:])
	digest := mac.Sum(nil)
	offset := digest[len(digest)-1] & 15
	value := binary.BigEndian.Uint32(digest[offset:offset+4]) & 0x7fffffff
	modulus := uint32(1000000)
	if v.digits == 8 {
		modulus = 100000000
	}
	return fmt.Sprintf("%0*d", v.digits, value%modulus), nil
}
func (v *Verifier) Match(secret []byte, code string, last *int64, now time.Time) (int64, bool) {
	if len(code) != v.digits || len(secret) == 0 || len(secret) > 128 || now.Unix() < 0 {
		return 0, false
	}
	for _, c := range code {
		if c < '0' || c > '9' {
			return 0, false
		}
	}
	step := now.Unix() / v.period
	if step > math.MaxInt64-int64(v.window) {
		return 0, false
	}
	candidates := []int64{step}
	for delta := 1; delta <= v.window; delta++ {
		candidates = append(candidates, step-int64(delta), step+int64(delta))
	}
	for _, candidate := range candidates {
		if candidate < 0 || (last != nil && candidate <= *last) {
			continue
		}
		expected, err := v.Code(secret, candidate)
		if err == nil && hmac.Equal([]byte(expected), []byte(code)) {
			return candidate, true
		}
	}
	return 0, false
}
