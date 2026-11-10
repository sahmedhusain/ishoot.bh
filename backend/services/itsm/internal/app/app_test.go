package app_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/itsm/internal/app"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/postgres"
	"platform.local/backend/services/itsm/migrations"
)

func setup(t *testing.T) (*app.Service, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     "itsm",
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))

	svc := app.New(postgres.New(pool), app.Options{
		Limits: domain.Limits{
			MaxAttachments:    5,
			MaxAttachmentSize: 1048576,
		},
		ITDisplayName:  "IT Helpdesk",
		BreachBatch:    10,
		ReminderWindow: time.Hour,
		ReminderBatch:  10,
	})
	return svc, pool
}

func TestTicketLifecycle(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	// Create Ticket
	t1, err := svc.Create(ctx, domain.NewTicket{
		Title:          "Cannot connect to VPN",
		Description:    "Getting error 500 when connecting to VPN.",
		Category:       "hardware",
		Subcategory:    "repair",
		Priority:       "high",
		RequesterID:    "user-1",
		RequesterName:  "User One",
		RequesterEmail: "user1@example.com",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, t1.ID)
	assert.Equal(t, "user-1", t1.RequesterID)
	assert.Equal(t, "new", t1.Status)

	// GetMine
	detail, err := svc.GetMine(ctx, t1.ID, "user-1")
	require.NoError(t, err)
	assert.Equal(t, t1.ID, detail.Ticket.ID)

	_, err = svc.GetMine(ctx, t1.ID, "user-2")
	assert.ErrorIs(t, err, domain.ErrNotFound)

	// ListMine
	mine, err := svc.ListMine(ctx, "user-1", "", nil, 10)
	require.NoError(t, err)
	assert.Len(t, mine, 1)

	// Invalid status list mine
	_, err = svc.ListMine(ctx, "user-1", "invalid_status", nil, 10)
	assert.Error(t, err)

	// CommentAsRequester
	cmt, err := svc.CommentAsRequester(ctx, t1.ID, app.Requester{ID: "user-1", Name: "User One"}, domain.NewComment{
		Body: "Here is extra log info.",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, cmt.ID)

	// CommentAsIT
	itP := authn.Principal{Subject: "it-agent-1"}
	cmtIT, err := svc.CommentAsIT(ctx, t1.ID, itP, domain.NewComment{
		Body:     "Investigating network issue.",
		Internal: true,
	})
	require.NoError(t, err)
	assert.True(t, cmtIT.Internal)

	// TransitionAsIT: assign & assigned
	tUpdated, err := svc.TransitionAsIT(ctx, t1.ID, itP, "assign", "it-agent-1", "IT Agent One")
	require.NoError(t, err)
	assert.Equal(t, "assigned", tUpdated.Status)
	assert.Equal(t, "it-agent-1", *tUpdated.AssigneeID)

	// Queue filtering
	q, err := svc.Queue(ctx, postgres.Filter{Status: "assigned"}, nil, 10)
	require.NoError(t, err)
	assert.Len(t, q, 1)

	// Queue invalid filter
	_, err = svc.Queue(ctx, postgres.Filter{Status: "bad_status"}, nil, 10)
	assert.Error(t, err)

	_, err = svc.Queue(ctx, postgres.Filter{Priority: "bad_priority"}, nil, 10)
	assert.Error(t, err)

	_, err = svc.Queue(ctx, postgres.Filter{Category: "bad_cat"}, nil, 10)
	assert.Error(t, err)

	// Detail
	dt, err := svc.Detail(ctx, t1.ID)
	require.NoError(t, err)
	assert.Equal(t, t1.ID, dt.Ticket.ID)
	assert.Len(t, dt.Comments, 2)

	// TransitionAsRequester: cancel ticket
	tCanceled, err := svc.TransitionAsRequester(ctx, t1.ID, app.Requester{ID: "user-1", Name: "User One"}, "cancel")
	require.NoError(t, err)
	assert.Equal(t, "cancelled", tCanceled.Status)

	// Comment on closed ticket fails
	_, err = svc.CommentAsRequester(ctx, t1.ID, app.Requester{ID: "user-1", Name: "User One"}, domain.NewComment{
		Body: "Can I reopen?",
	})
	assert.ErrorIs(t, err, domain.ErrTransition)
}

func TestSLAAndStats(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	stats, err := svc.Stats(ctx)
	require.NoError(t, err)
	assert.NotNil(t, stats)

	slas, err := svc.SLA(ctx)
	require.NoError(t, err)
	assert.NotNil(t, slas)

	// Update SLA invalid policy
	err = svc.UpdateSLA(ctx, authn.Principal{Subject: "admin"}, domain.Policy{
		Priority: "invalid_prio",
	})
	assert.Error(t, err)

	// Breach & Reminder check
	breached, err := svc.MarkBreached(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, breached, 0)

	reminders, err := svc.CheckSLAReminders(ctx)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, reminders, 0)
}
