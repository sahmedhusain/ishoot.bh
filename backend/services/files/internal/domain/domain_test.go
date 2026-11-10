package domain
import (
	"strings"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestParseURL(t *testing.T) {
	loc, err := ParseURL("/api/files/general/abc_report.pdf")
	require.NoError(t, err)
	assert.Equal(t, "general/abc_report.pdf", loc.Key())
	assert.Equal(t, "application/pdf", loc.Type.MIME)
	assert.False(t, loc.Folder.Public)
	assert.Equal(t, "/api/files/general/abc_report.pdf", loc.URL())
	loc, err = ParseURL("/api/files/brand/x.jpeg")
	require.NoError(t, err)
	assert.True(t, loc.Folder.Public)
	assert.Equal(t, "image/jpeg", loc.Type.MIME)
	tests := map[string]error{
		"/files/general/a.pdf":			ErrInvalidURL,
		"/api/files/general":			ErrInvalidURL,
		"/api/files/unknown/a.pdf":		ErrInvalidURL,
		"/api/files/general/../a.pdf":		ErrInvalidURL,
		"/api/files/general/a b.pdf":		ErrInvalidURL,
		"/api/files/general/sub/a.pdf":		ErrInvalidURL,
		"/api/files/general/a.html":		ErrTypeNotAllowed,
		"/api/files/general/font.woff2":	ErrTypeNotAllowed,
	}
	for url, want := range tests {
		t.Run(url, func(t *testing.T) {
			_, err := ParseURL(url)
			assert.ErrorIs(t, err, want)
		})
	}
}
func TestNewLocation(t *testing.T) {
	loc, err := NewLocation("brand", "Company Logo (final).PNG", "image/png")
	require.NoError(t, err)
	assert.True(t, strings.HasSuffix(loc.Name, "_Company_Logo__final_.png"))
	parsed, err := ParseURL(loc.URL())
	require.NoError(t, err, "every generated name is a valid address")
	assert.Equal(t, loc.Key(), parsed.Key())
	long, err := NewLocation("general", strings.Repeat("a", 90)+".pdf", "application/pdf")
	require.NoError(t, err)
	assert.LessOrEqual(t, len(long.Name), 36+1+40+4)
	_, err = NewLocation("general", "f.woff2", "font/woff2")
	assert.ErrorIs(t, err, ErrTypeNotAllowed)
	_, err = NewLocation("nowhere", "a.pdf", "application/pdf")
	assert.ErrorIs(t, err, ErrInvalidURL)
}
func TestDetectType(t *testing.T) {
	tests := map[string][]byte{
		"application/pdf":	[]byte("%PDF-1.7"),
		"image/png":		{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a},
		"image/jpeg":		{0xff, 0xd8, 0xff, 0xe0},
		"image/webp":		[]byte("RIFF\x00\x00\x00\x00WEBP"),
		"font/woff2":		[]byte("wOF2"),
		"font/woff":		[]byte("wOFF"),
		"font/otf":		[]byte("OTTO"),
		"font/ttf":		{0x00, 0x01, 0x00, 0x00},
		"":			[]byte("<html>"),
	}
	for want, head := range tests {
		assert.Equal(t, want, DetectType(head), "%q", head)
	}
	assert.Empty(t, DetectType([]byte("RIFF")), "too short for webp")
}
func TestClaimable(t *testing.T) {
	now := time.Now()
	f := File{OwnerID: "u1", ExpiresAt: now.Add(time.Hour)}
	assert.NoError(t, f.Claimable("u1", now))
	assert.ErrorIs(t, f.Claimable("u2", now), ErrNotOwner)
	assert.ErrorIs(t, File{ExpiresAt: now.Add(time.Hour)}.Claimable("", now), ErrNotOwner)
	assert.ErrorIs(t, File{OwnerID: "u1", ExpiresAt: now}.Claimable("u1", now), ErrUnavailable)
	claimed := now
	assert.ErrorIs(t, File{OwnerID: "u1", ExpiresAt: now.Add(time.Hour), ClaimedAt: &claimed}.Claimable("u1", now), ErrUnavailable)
}
func TestCleanFileName(t *testing.T) {
	assert.Equal(t, "report.pdf", CleanFileName("  report.pdf\x00 "))
	assert.Equal(t, "ab.pdf", CleanFileName("a/b.pdf"))
	assert.Len(t, []rune(CleanFileName(strings.Repeat("ب", 300))), 200)
}
