package remote
import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestPublic(t *testing.T) {
	for addr, want := range map[string]bool{
		"8.8.8.8":	true, "2606:4700::1111": true,
		"127.0.0.1":	false, "10.1.2.3": false, "172.16.0.1": false, "192.168.1.1": false, "169.254.169.254": false,
		"100.64.0.1":	false, "0.0.0.0": false, "::1": false, "fd00::1": false, "fe80::1": false, "::ffff:127.0.0.1": false,
		"224.0.0.1":	false, "198.18.0.1": false,
	} {
		assert.Equal(t, want, Public(netip.MustParseAddr(addr)), addr)
	}
}
func TestFetch(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\nrest-of-image")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/me.png":
			_, _ = w.Write(png)
		case "/hop":
			http.Redirect(w, r, "/me.png", http.StatusFound)
		case "/big":
			_, _ = w.Write(make([]byte, 100))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)
	ctx := context.Background()
	_, err := New(time.Second, 50, false).Fetch(ctx, server.URL+"/me.png")
	assert.ErrorIs(t, err, ErrBlocked)
	f := New(time.Second, 50, true)
	got, err := f.Fetch(ctx, server.URL+"/hop")
	require.NoError(t, err)
	assert.Equal(t, png, got.Body)
	assert.Equal(t, "me.png", got.FileName, "the name after redirects")
	_, err = f.Fetch(ctx, server.URL+"/big")
	assert.ErrorIs(t, err, ErrTooLarge)
	_, err = f.Fetch(ctx, server.URL+"/missing")
	assert.ErrorIs(t, err, ErrUnreachable)
	for _, bad := range []string{"file:///etc/passwd", "ftp://example.com/a.png", "https://user:pw@example.com/a.png", "not a url", "//example.com/a.png"} {
		_, err = f.Fetch(ctx, bad)
		assert.ErrorIs(t, err, ErrBlocked, bad)
	}
}
