package objectstore_test
import (
	"bytes"
	"context"
	"errors"
	"io"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/pkg/testkit"
)
func TestS3RoundTrip(t *testing.T) {
	server := testkit.S3(t)
	ctx := context.Background()
	store := objectstore.New(objectstore.Config{
		Endpoint:	server.Endpoint, Region: "us-east-1", AccessKeyID: server.AccessKeyID,
		SecretAccessKey:	server.SecretAccessKey, UsePathStyle: true, Timeout: 10 * time.Second,
	})
	require.Eventually(t, func() bool { return store.EnsureBucket(ctx, "private") == nil }, 30*time.Second, 500*time.Millisecond)
	require.NoError(t, store.EnsureBucket(ctx, "private"), "creating an existing bucket is fine")
	require.NoError(t, store.Check("private")(ctx))
	body := []byte("%PDF-1.7 test document")
	require.NoError(t, store.Put(ctx, "private", "general/a.pdf", bytes.NewReader(body), int64(len(body)), "application/pdf"))
	streamed := io.MultiReader(bytes.NewReader(body[:4]), bytes.NewReader(body[4:]))
	require.NoError(t, store.Put(ctx, "private", "general/streamed.pdf", streamed, int64(len(body)), "application/pdf"))
	info, err := store.Head(ctx, "private", "general/a.pdf")
	require.NoError(t, err)
	assert.Equal(t, int64(len(body)), info.Size)
	assert.Equal(t, "application/pdf", info.ContentType)
	head, err := store.GetRange(ctx, "private", "general/a.pdf", 4)
	require.NoError(t, err)
	assert.Equal(t, "%PDF", string(head))
	reader, info, err := store.Get(ctx, "private", "general/a.pdf")
	require.NoError(t, err)
	got, _ := io.ReadAll(reader)
	_ = reader.Close()
	assert.Equal(t, body, got)
	assert.Equal(t, int64(len(body)), info.Size)
	require.NoError(t, store.Delete(ctx, "private", "general/a.pdf"))
	require.NoError(t, store.Delete(ctx, "private", "general/a.pdf"), "deleting twice is fine")
	_, err = store.Head(ctx, "private", "general/a.pdf")
	assert.True(t, errors.Is(err, objectstore.ErrNotFound))
	_, _, err = store.Get(ctx, "private", "general/missing.pdf")
	assert.True(t, errors.Is(err, objectstore.ErrNotFound))
}
