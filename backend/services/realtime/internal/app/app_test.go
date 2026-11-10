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

	"platform.local/backend/pkg/live"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/realtime/internal/app"
	"platform.local/backend/services/realtime/internal/postgres"
	"platform.local/backend/services/realtime/internal/presence"
	"platform.local/backend/services/realtime/migrations"
)

func setup(t *testing.T) (*app.Service, *pgxpool.Pool, *presence.Memory, *live.Recorder) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))

	tracker := presence.NewMemory()
	publisher := &live.Recorder{}
	svc := app.New(postgres.New(pool), tracker, publisher)
	return svc, pool, tracker, publisher
}

func TestPresenceAndMine(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := setup(t)

	// Presence query for non-existent / offline user
	res, err := svc.Presence(ctx, "staff", []string{"user-1", "user-2"})
	require.NoError(t, err)
	assert.Len(t, res, 2)
	assert.Equal(t, "user-1", res[0].UserID)
	assert.Equal(t, app.ConnOffline, res[0].Connection)

	// Invalid realm or user IDs
	_, err = svc.Presence(ctx, "invalid-realm", []string{"user-1"})
	assert.ErrorIs(t, err, app.ErrValidation)

	_, err = svc.Presence(ctx, "staff", []string{""})
	assert.ErrorIs(t, err, app.ErrValidation)

	// Empty IDs
	emptyRes, err := svc.Presence(ctx, "staff", []string{})
	require.NoError(t, err)
	assert.Empty(t, emptyRes)

	// Mine
	mine, err := svc.Mine(ctx, "staff", "user-1")
	require.NoError(t, err)
	assert.Equal(t, "user-1", mine.Presence.UserID)
	assert.Nil(t, mine.Chosen)
	assert.Empty(t, mine.Upcoming)
}

func TestStatusLifecycle(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := setup(t)

	// Set valid status
	msg := "In a meeting"
	exp := time.Now().UTC().Add(time.Hour)
	mine, err := svc.SetStatus(ctx, "staff", "user-1", app.Chosen{
		Status:    "busy",
		Message:   &msg,
		ExpiresAt: &exp,
	})
	require.NoError(t, err)
	require.NotNil(t, mine.Chosen)
	assert.Equal(t, "busy", mine.Chosen.Status)
	assert.Equal(t, "In a meeting", *mine.Chosen.Message)

	// Invalid status choice (not manual)
	_, err = svc.SetStatus(ctx, "staff", "user-1", app.Chosen{
		Status: "invalid_status",
	})
	assert.ErrorIs(t, err, app.ErrValidation)

	// Expiry in past
	past := time.Now().UTC().Add(-time.Hour)
	_, err = svc.SetStatus(ctx, "staff", "user-1", app.Chosen{
		Status:    "busy",
		ExpiresAt: &past,
	})
	assert.ErrorIs(t, err, app.ErrValidation)

	// Clear Status
	mineCleared, err := svc.ClearStatus(ctx, "staff", "user-1")
	require.NoError(t, err)
	assert.Nil(t, mineCleared.Chosen)
}

func TestConnectionsAndActivity(t *testing.T) {
	ctx := context.Background()
	svc, _, tracker, _ := setup(t)

	// Connect
	err := svc.Connected(ctx, "staff", "user-1", true)
	require.NoError(t, err)

	// Set Idle
	err = svc.SetActivity(ctx, "staff", "user-1", true)
	require.NoError(t, err)

	states, err := tracker.States(ctx, "staff", []string{"user-1"})
	require.NoError(t, err)
	assert.True(t, states["user-1"].Online)
	assert.True(t, states["user-1"].Idle)

	// Check Presence
	pres, err := svc.Presence(ctx, "staff", []string{"user-1"})
	require.NoError(t, err)
	assert.Equal(t, app.ConnIdle, pres[0].Connection)

	// Disconnect
	err = svc.Disconnected(ctx, "staff", "user-1")
	require.NoError(t, err)

	presOff, err := svc.Presence(ctx, "staff", []string{"user-1"})
	require.NoError(t, err)
	assert.Equal(t, app.ConnOffline, presOff[0].Connection)
}

func TestWindowManagement(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := setup(t)

	now := time.Now().UTC()
	starts := now.Add(time.Hour)
	ends := starts.Add(2 * time.Hour)

	win := app.WindowInput{
		SourceID: "cal-event-1",
		Kind:     "meeting",
		StartsAt: starts,
		EndsAt:   ends,
		UserIDs:  []string{"user-1"},
	}

	// Replace Window
	err := svc.ReplaceWindow(ctx, "staff", "calendar", win)
	require.NoError(t, err)

	// Mine should reflect upcoming window
	mine, err := svc.Mine(ctx, "staff", "user-1")
	require.NoError(t, err)
	assert.Len(t, mine.Upcoming, 1)

	// Sync Windows
	n, err := svc.SyncWindows(ctx, "staff", "calendar", now, now.Add(24*time.Hour), []app.WindowInput{win}, 10)
	require.NoError(t, err)
	assert.Equal(t, 1, n)

	// Remove Window
	err = svc.RemoveWindow(ctx, "staff", "calendar", "cal-event-1")
	require.NoError(t, err)

	// Remove non-existent window returns ErrNotFound
	err = svc.RemoveWindow(ctx, "staff", "calendar", "cal-event-999")
	assert.ErrorIs(t, err, app.ErrNotFound)
}

func TestPublishTickPurge(t *testing.T) {
	ctx := context.Background()
	svc, _, _, _ := setup(t)

	ev, err := live.New("custom.event", map[string]string{"foo": "bar"})
	require.NoError(t, err)

	// Publish to topics and users
	err = svc.Publish(ctx, []string{"notifications"}, []live.Target{{Realm: "staff", ID: "user-1"}}, ev)
	require.NoError(t, err)

	// Publish invalid topic (e.g. presence.xxx or invalid format)
	err = svc.Publish(ctx, []string{"presence.staff"}, nil, ev)
	assert.ErrorIs(t, err, app.ErrValidation)

	// Tick
	now := time.Now().UTC()
	err = svc.Tick(ctx, now.Add(-time.Minute), now)
	require.NoError(t, err)

	// Purge
	err = svc.Purge(ctx, 24*time.Hour)
	require.NoError(t, err)
}
