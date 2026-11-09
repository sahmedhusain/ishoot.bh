package filesclient

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestDeletePrivateOnlyDeletesPrivateRecords(t *testing.T) {
	var deleted []string
	transport := roundTripFunc(func(request *http.Request) (*http.Response, error) {
		status := http.StatusOK
		body := `{"items":[]}`
		switch request.Method {
		case http.MethodGet:
			switch request.URL.Query().Get("fileUrl") {
			case "/private.pdf":
				body = `{"items":[{"fileUrl":"/private.pdf","isPublic":false}]}`
			case "/public.pdf":
				body = `{"items":[{"fileUrl":"/public.pdf","isPublic":true}]}`
			}
		case http.MethodDelete:
			deleted = append(deleted, request.URL.Query().Get("fileUrl"))
			status = http.StatusNoContent
		}
		return &http.Response{StatusCode: status, Status: http.StatusText(status), Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})
	client := New("https://files.example", transport)

	for _, fileURL := range []string{"/private.pdf", "/public.pdf", "/missing.pdf"} {
		require.NoError(t, client.DeletePrivate(context.Background(), fileURL))
	}
	require.Equal(t, []string{"/private.pdf"}, deleted)
}

func TestDeletePrivatePropagatesFilesServiceFailures(t *testing.T) {
	client := New("https://files.example", roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusServiceUnavailable, Status: "503 Service Unavailable",
			Body: io.NopCloser(strings.NewReader("")), Header: make(http.Header)}, nil
	}))
	require.Error(t, client.DeletePrivate(context.Background(), "/private.pdf"))
}
