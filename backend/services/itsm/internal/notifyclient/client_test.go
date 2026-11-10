package notifyclient_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/services/itsm/internal/notifyclient"
)

func TestQueueEmail(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/notify/messages", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	client := notifyclient.New(ts.URL, http.DefaultTransport)
	err := client.QueueEmail(context.Background(), "user@example.com", "Subject", "Text", "", "idem-1", "actor-1")
	require.NoError(t, err)
}

func TestDeliverInApp(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/notify/inbox", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	client := notifyclient.New(ts.URL, http.DefaultTransport)
	err := client.DeliverInApp(context.Background(), []notifyclient.InAppNotification{
		{Realm: "staff", Recipient: "u1", Title: "Test Ticket"},
	})
	require.NoError(t, err)
}
