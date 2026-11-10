package password
import (
	"strings"
	"testing"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)
func config() Config {
	return Config{Memory: 19456, Iterations: 2, Parallelism: 1, MaxMemory: 262144, MaxIterations: 10, MaxParallelism: 16, MaxBcryptCost: 16}
}
func TestRoundTripAndUniqueSalt(t *testing.T) {
	h, err := New(config())
	require.NoError(t, err)
	first, err := h.Hash("correct horse battery staple")
	require.NoError(t, err)
	second, err := h.Hash("correct horse battery staple")
	require.NoError(t, err)
	require.NotEqual(t, first, second)
	rehash, err := h.Verify("correct horse battery staple", first)
	require.NoError(t, err)
	require.False(t, rehash)
	rehash, err = h.Verify("wrong", first)
	require.ErrorIs(t, err, ErrInvalid)
	require.False(t, rehash)
}
func TestLegacyBcrypt(t *testing.T) {
	h, err := New(config())
	require.NoError(t, err)
	hash, err := bcrypt.GenerateFromPassword([]byte("existing password"), bcrypt.MinCost)
	require.NoError(t, err)
	for _, prefix := range []string{"$2a$", "$2b$", "$2y$"} {
		stored := prefix + string(hash)[4:]
		rehash, err := h.Verify("existing password", stored)
		require.NoError(t, err)
		require.True(t, rehash)
		rehash, err = h.Verify("wrong", stored)
		require.ErrorIs(t, err, ErrInvalid)
		require.False(t, rehash)
	}
}
func TestRefusesMalformedAndUnboundedHashes(t *testing.T) {
	h, err := New(config())
	require.NoError(t, err)
	encoded, err := h.Hash("test password")
	require.NoError(t, err)
	for _, stored := range []string{"", "plaintext", strings.Replace(encoded, "v=19", "v=16", 1), strings.Replace(encoded, "m=19456", "m=4294967295", 1), strings.Replace(encoded, "t=2", "t=4294967295", 1), strings.Replace(encoded, "p=1", "p=256", 1), strings.Replace(encoded, "p=1", "p=0", 1), strings.Replace(encoded, "m=19456", "m=1", 1), encoded + "$extra", strings.Repeat("x", 513), "$2b$31$" + strings.Repeat("a", 53)} {
		rehash, err := h.Verify("test password", stored)
		require.ErrorIs(t, err, ErrInvalid, stored)
		require.False(t, rehash)
	}
	for _, value := range []string{"", strings.Repeat("a", 1025)} {
		_, err := h.Hash(value)
		require.ErrorIs(t, err, ErrInvalid)
	}
}
func TestUpgradeWeakerArgonWithoutDowngradingStronger(t *testing.T) {
	base, err := New(config())
	require.NoError(t, err)
	encoded, err := base.Hash("password")
	require.NoError(t, err)
	stronger := config()
	stronger.Memory *= 2
	next, err := New(stronger)
	require.NoError(t, err)
	rehash, err := next.Verify("password", encoded)
	require.NoError(t, err)
	require.True(t, rehash)
	encoded, err = next.Hash("password")
	require.NoError(t, err)
	rehash, err = base.Verify("password", encoded)
	require.NoError(t, err)
	require.False(t, rehash)
}
func TestRejectsUnsafeConfiguration(t *testing.T) {
	for _, mutate := range []func(*Config){func(c *Config) { c.Memory = 1024 }, func(c *Config) { c.Iterations = 1 }, func(c *Config) { c.Parallelism = 0 }, func(c *Config) { c.MaxMemory = 1 }, func(c *Config) { c.MaxBcryptCost = 31 }} {
		cfg := config()
		mutate(&cfg)
		_, err := New(cfg)
		require.Error(t, err)
	}
}
