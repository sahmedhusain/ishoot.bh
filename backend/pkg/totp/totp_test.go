package totp
import (
	"testing"
	"time"
	"github.com/stretchr/testify/require"
)
func TestRFC6238Vectors(t *testing.T) {
	v, err := New(Config{Period: 30 * time.Second, Digits: 8, Window: 1})
	require.NoError(t, err)
	secret := []byte("12345678901234567890")
	for _, tc := range []struct {
		timestamp	int64
		code		string
	}{{59, "94287082"}, {1111111109, "07081804"}, {1111111111, "14050471"}, {1234567890, "89005924"}, {2000000000, "69279037"}, {20000000000, "65353130"}} {
		got, err := v.Code(secret, tc.timestamp/30)
		require.NoError(t, err)
		require.Equal(t, tc.code, got)
		step, ok := v.Match(secret, tc.code, nil, time.Unix(tc.timestamp, 0))
		require.True(t, ok)
		require.Equal(t, tc.timestamp/30, step)
		_, ok = v.Match(secret, tc.code, &step, time.Unix(tc.timestamp, 0))
		require.False(t, ok, "a used step cannot be accepted again")
	}
}
func TestLegacyWindowAndInvalidInputs(t *testing.T) {
	v, err := New(Config{Period: 30 * time.Second, Digits: 6, Window: 1})
	require.NoError(t, err)
	secret := []byte("12345678901234567890")
	now := time.Unix(3000, 0)
	for _, step := range []int64{99, 100, 101} {
		code, err := v.Code(secret, step)
		require.NoError(t, err)
		matched, ok := v.Match(secret, code, nil, now)
		require.True(t, ok)
		require.Equal(t, step, matched)
	}
	code, err := v.Code(secret, 98)
	require.NoError(t, err)
	_, ok := v.Match(secret, code, nil, now)
	require.False(t, ok)
	for _, code := range []string{"", "12345", "1234567", "abcdef", "１２３４５６"} {
		_, ok := v.Match(secret, code, nil, now)
		require.False(t, ok)
	}
	_, ok = v.Match(nil, "123456", nil, now)
	require.False(t, ok)
	_, err = New(Config{Period: 30 * time.Second, Digits: 5, Window: 1})
	require.Error(t, err)
	_, err = New(Config{Period: time.Millisecond, Digits: 6, Window: 1})
	require.Error(t, err)
	_, err = New(Config{Period: 30 * time.Second, Digits: 6, Window: 3})
	require.Error(t, err)
}
func TestRecoveryCodeCompatibility(t *testing.T) {
	codes, hashes, err := NewRecoveryCodes(10)
	require.NoError(t, err)
	require.Len(t, codes, 10)
	require.Len(t, hashes, 10)
	require.Len(t, hashes[0], 64)
	require.NotEqual(t, codes[0], hashes[0])
	for i, code := range codes {
		hash, ok := RecoveryHash(code)
		require.True(t, ok)
		require.Equal(t, hashes[i], hash)
		for j := 0; j < i; j++ {
			require.NotEqual(t, codes[j], code)
		}
	}
	for _, code := range []string{"", "ABCDEF0123456789abcdef0123456789", "x1234567890123456789012345678901", "012345678901234567890123456789012"} {
		_, ok := RecoveryHash(code)
		require.False(t, ok)
	}
	_, _, err = NewRecoveryCodes(0)
	require.Error(t, err)
	_, _, err = NewRecoveryCodes(65)
	require.Error(t, err)
}
