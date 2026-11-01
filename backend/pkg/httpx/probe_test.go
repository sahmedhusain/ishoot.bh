package httpx

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestProbe(t *testing.T) {
	status := http.StatusOK
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/readyz", r.URL.Path)
		w.WriteHeader(status)
	}))
	defer srv.Close()
	_, port, _ := net.SplitHostPort(srv.Listener.Addr().String())

	assert.NoError(t, Probe(context.Background(), ":"+port, time.Second))
	status = http.StatusServiceUnavailable
	assert.Error(t, Probe(context.Background(), ":"+port, time.Second))
	assert.Error(t, Probe(context.Background(), "bad-address", time.Second))
}
