package filesclient_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/services/system/internal/filesclient"
)

func TestFilesClientLookup(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/files/records", r.URL.Path)
		assert.Equal(t, "/api/files/general/doc.pdf", r.URL.Query().Get("fileUrl"))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"items": [
				{
					"fileUrl": "/api/files/general/doc.pdf",
					"mimeType": "application/pdf",
					"fileSize": 1024,
					"isPublic": false
				}
			]
		}`))
	}))
	defer ts.Close()

	client := filesclient.New(ts.URL, http.DefaultTransport)
	file, err := client.Lookup(context.Background(), "/api/files/general/doc.pdf")
	require.NoError(t, err)
	assert.Equal(t, "/api/files/general/doc.pdf", file.URL)
	assert.Equal(t, "application/pdf", file.MIME)
	assert.Equal(t, int64(1024), file.Size)
	assert.False(t, file.Public)
}
