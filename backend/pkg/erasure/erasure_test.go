package erasure_test
import (
	"testing"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/erasure"
)
func TestEmailHash(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef")
	h := erasure.EmailHash(key, "ann@example.test")
	require.Len(t, h, 64)
	require.Equal(t, h, erasure.EmailHash(key, "  ANN@Example.TEST "), "case and spaces do not matter")
	require.NotEqual(t, h, erasure.EmailHash(key, "bob@example.test"))
	require.NotEqual(t, h, erasure.EmailHash([]byte("another key another key another!"), "ann@example.test"), "the key matters")
}
