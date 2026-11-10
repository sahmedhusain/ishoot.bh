package password
import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)
var ErrInvalid = errors.New("invalid credentials")
type Config struct {
	Memory		uint32	`env:"MEMORY_KIB" envDefault:"19456"`
	Iterations	uint32	`env:"ITERATIONS" envDefault:"2"`
	Parallelism	uint8	`env:"PARALLELISM" envDefault:"1"`
	MaxMemory	uint32	`env:"MAX_MEMORY_KIB" envDefault:"262144"`
	MaxIterations	uint32	`env:"MAX_ITERATIONS" envDefault:"10"`
	MaxParallelism	uint8	`env:"MAX_PARALLELISM" envDefault:"16"`
	MaxBcryptCost	int	`env:"MAX_BCRYPT_COST" envDefault:"16"`
}
type Hasher struct{ cfg Config }
func New(cfg Config) (*Hasher, error) {
	if cfg.Memory < 19456 || cfg.Iterations < 2 || cfg.Parallelism == 0 ||
		cfg.Memory < 8*uint32(cfg.Parallelism) || cfg.Memory > cfg.MaxMemory ||
		cfg.Iterations > cfg.MaxIterations || cfg.Parallelism > cfg.MaxParallelism ||
		cfg.MaxMemory > 1048576 || cfg.MaxIterations > 32 || cfg.MaxParallelism > 64 ||
		cfg.MaxBcryptCost < bcrypt.MinCost || cfg.MaxBcryptCost > 16 {
		return nil, errors.New("invalid password hashing configuration")
	}
	return &Hasher{cfg: cfg}, nil
}
const saltLength = 16
const keyLength = 32
const maxPasswordBytes = 1024
func (h *Hasher) Hash(password string) (string, error) {
	if len(password) == 0 || len(password) > maxPasswordBytes {
		return "", ErrInvalid
	}
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("password salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, h.cfg.Iterations, h.cfg.Memory, h.cfg.Parallelism, keyLength)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", h.cfg.Memory, h.cfg.Iterations, h.cfg.Parallelism, base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key)), nil
}
func (h *Hasher) Verify(password, encoded string) (bool, error) {
	if len(password) == 0 || len(password) > maxPasswordBytes || len(encoded) > 512 {
		return false, ErrInvalid
	}
	if strings.HasPrefix(encoded, "$2a$") || strings.HasPrefix(encoded, "$2b$") || strings.HasPrefix(encoded, "$2y$") {
		cost, err := bcrypt.Cost([]byte(encoded))
		if err != nil || cost > h.cfg.MaxBcryptCost || len(password) > 72 {
			return false, ErrInvalid
		}
		if bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password)) != nil {
			return false, ErrInvalid
		}
		return true, nil
	}
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false, ErrInvalid
	}
	params := strings.Split(parts[3], ",")
	if len(params) != 3 {
		return false, ErrInvalid
	}
	values := make([]uint32, 3)
	for i, prefix := range []string{"m=", "t=", "p="} {
		if !strings.HasPrefix(params[i], prefix) {
			return false, ErrInvalid
		}
		value, err := strconv.ParseUint(strings.TrimPrefix(params[i], prefix), 10, 32)
		if err != nil || value == 0 {
			return false, ErrInvalid
		}
		values[i] = uint32(value)
	}
	memory, iterations, parallel := values[0], values[1], values[2]
	if parallel > 64 || parallel > uint32(h.cfg.MaxParallelism) || memory > h.cfg.MaxMemory || memory < 8*parallel || iterations > h.cfg.MaxIterations {
		return false, ErrInvalid
	}
	salt, err := base64.RawStdEncoding.Strict().DecodeString(parts[4])
	if err != nil || len(salt) < 8 || len(salt) > 64 {
		return false, ErrInvalid
	}
	expected, err := base64.RawStdEncoding.Strict().DecodeString(parts[5])
	if err != nil || len(expected) != keyLength {
		return false, ErrInvalid
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, uint8(parallel), keyLength)
	if subtle.ConstantTimeCompare(actual, expected) != 1 {
		return false, ErrInvalid
	}
	return memory < h.cfg.Memory || iterations < h.cfg.Iterations || len(salt) < saltLength, nil
}
