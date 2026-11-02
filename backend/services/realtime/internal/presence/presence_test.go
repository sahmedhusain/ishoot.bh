package presence

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/realtime/internal/hub"
)

func TestRedisTracker(t *testing.T) {
	ctx := context.Background()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	now := time.Date(2026, 11, 2, 9, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }
	a := &Redis{Client: client, Replica: "a", TTL: time.Minute, IdleTTL: 10 * time.Minute, SeenTTL: time.Hour, Now: clock}
	b := &Redis{Client: client, Replica: "b", TTL: time.Minute, IdleTTL: 10 * time.Minute, SeenTTL: time.Hour, Now: clock}

	require.NoError(t, a.Online(ctx, "staff", "u1"))
	require.NoError(t, b.Online(ctx, "staff", "u1"))
	states, err := a.States(ctx, "staff", []string{"u1", "u2"})
	require.NoError(t, err)
	assert.True(t, states["u1"].Online)
	assert.False(t, states["u2"].Online)
	assert.Nil(t, states["u2"].LastSeen)

	require.NoError(t, a.Offline(ctx, "staff", "u1"))
	states, _ = a.States(ctx, "staff", []string{"u1"})
	assert.True(t, states["u1"].Online, "still connected through replica b")

	require.NoError(t, b.SetIdle(ctx, "staff", "u1", true))
	states, _ = a.States(ctx, "staff", []string{"u1"})
	assert.True(t, states["u1"].Idle)
	require.NoError(t, b.SetIdle(ctx, "staff", "u1", false))
	states, _ = a.States(ctx, "staff", []string{"u1"})
	assert.False(t, states["u1"].Idle)

	// Replica b dies: its mark expires without being removed.
	now = now.Add(2 * time.Minute)
	states, _ = a.States(ctx, "staff", []string{"u1"})
	assert.False(t, states["u1"].Online)
	require.NotNil(t, states["u1"].LastSeen, "seen when a disconnected")

	require.NoError(t, b.Refresh(ctx, []hub.User{{Realm: "staff", ID: "u1"}}))
	states, _ = a.States(ctx, "it", []string{"u1"})
	assert.False(t, states["u1"].Online, "realms are separate")
	states, _ = a.States(ctx, "staff", []string{"u1"})
	assert.True(t, states["u1"].Online, "a renewed mark counts again")
}

func TestMemoryTracker(t *testing.T) {
	ctx := context.Background()
	m := NewMemory()
	require.NoError(t, m.Online(ctx, "it", "x"))
	require.NoError(t, m.SetIdle(ctx, "it", "x", true))
	states, _ := m.States(ctx, "it", []string{"x"})
	assert.Equal(t, Connection{Online: true, Idle: true}, states["x"])
	require.NoError(t, m.Offline(ctx, "it", "x"))
	states, _ = m.States(ctx, "it", []string{"x"})
	assert.False(t, states["x"].Online)
	assert.NotNil(t, states["x"].LastSeen)
}
