package app
import (
	"context"
	"fmt"
	"strings"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/services/files/internal/domain"
	"platform.local/backend/services/files/internal/remote"
)
type fakeImporter map[string]remote.Fetched
func (f fakeImporter) Fetch(_ context.Context, link string) (remote.Fetched, error) {
	switch link {
	case "blocked":
		return remote.Fetched{}, remote.ErrBlocked
	case "huge":
		return remote.Fetched{}, remote.ErrTooLarge
	}
	got, ok := f[link]
	if !ok {
		return remote.Fetched{}, fmt.Errorf("%w: 404", remote.ErrUnreachable)
	}
	return got, nil
}
func TestImport(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	png := []byte("\x89PNG\r\n\x1a\n" + strings.Repeat("x", 40))
	_, err := f.svc.Import(ctx, "u1", "avatars", "https://example.com/me.png")
	assert.ErrorIs(t, err, ErrImportsOff)
	f.svc.SetImporter(fakeImporter{
		"https://example.com/me.png":	{Body: png, FileName: "me.png"},
		"https://example.com/doc":	{Body: pdf},
		"https://example.com/big":	{Body: make([]byte, 2048)},
	})
	file, err := f.svc.Import(ctx, "u1", "avatars", "https://example.com/me.png")
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(file.URL, "/api/files/avatars/"))
	assert.True(t, strings.HasSuffix(file.URL, ".png"))
	assert.Nil(t, file.ClaimedAt, "an import expires unless claimed, like an upload")
	_, err = f.svc.Claim(ctx, file.URL, "u1", true)
	require.NoError(t, err, "the owner claims it as their own upload")
	_, err = f.svc.Import(ctx, "u1", "avatars", "https://example.com/doc")
	assert.ErrorIs(t, err, domain.ErrTypeNotAllowed, "avatars hold images only, judged by the bytes")
	_, err = f.svc.Import(ctx, "u1", "avatars", "https://example.com/big")
	assert.ErrorIs(t, err, domain.ErrTooLarge)
	_, err = f.svc.Import(ctx, "u1", "avatars", "huge")
	assert.ErrorIs(t, err, domain.ErrTooLarge)
	_, err = f.svc.Import(ctx, "u1", "avatars", "blocked")
	assert.ErrorIs(t, err, ErrSourceBlocked)
	_, err = f.svc.Import(ctx, "u1", "avatars", "https://example.com/missing")
	assert.ErrorIs(t, err, ErrSourceUnreachable)
	_, err = f.svc.Import(ctx, "", "avatars", "https://example.com/me.png")
	assert.ErrorIs(t, err, domain.ErrNotOwner)
}
