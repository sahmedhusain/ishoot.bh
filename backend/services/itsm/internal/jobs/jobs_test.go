package jobs

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/riverqueue/river"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/notifyclient"
)

func TestNotificationWorkerSkipsSyntheticRequesters(t *testing.T) {
	var inboxCalls, emailCalls atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/notify/inbox":
			inboxCalls.Add(1)
		case "/v1/notify/messages":
			emailCalls.Add(1)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	worker := &NotificationWorker{Notifier: notifyclient.New(ts.URL, http.DefaultTransport)}

	err := worker.Work(context.Background(), &river.Job[domain.NotificationArgs]{
		Args: domain.NotificationArgs{
			TicketID:       "t-1",
			EventKind:      "created",
			RequesterID:    "visitor:abc123",
			RequesterEmail: "anonymous+web@visitor.invalid",
			TicketNumber:   1,
			TicketTitle:    "[WEB 500] ERR-1",
		},
	})
	require.NoError(t, err)
	assert.Zero(t, inboxCalls.Load(), "anonymous visitor should not receive staff inbox notifications")
	assert.Zero(t, emailCalls.Load(), ".invalid synthetic email should not queue outbound mail")

	err = worker.Work(context.Background(), &river.Job[domain.NotificationArgs]{
		Args: domain.NotificationArgs{
			TicketID:       "t-2",
			EventKind:      "created",
			RequesterID:    "emp-1",
			RequesterEmail: "emp-1@example.com",
			TicketNumber:   2,
			TicketTitle:    "[ADMIN 500] ERR-2",
		},
	})
	require.NoError(t, err)
	assert.Equal(t, int32(1), inboxCalls.Load())
	assert.Equal(t, int32(1), emailCalls.Load())
}
