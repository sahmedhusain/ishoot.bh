package presence
import (
	"context"
	"errors"
	"strconv"
	"sync"
	"time"
	"github.com/redis/go-redis/v9"
	"platform.local/backend/services/realtime/internal/hub"
)
type Connection struct {
	Online		bool
	Idle		bool
	LastSeen	*time.Time
}
type Tracker interface {
	Online(ctx context.Context, realm, id string) error
	Offline(ctx context.Context, realm, id string) error
	Refresh(ctx context.Context, users []hub.User) error
	SetIdle(ctx context.Context, realm, id string, idle bool) error
	States(ctx context.Context, realm string, ids []string) (map[string]Connection, error)
}
type Redis struct {
	Client	redis.UniversalClient
	Replica	string
	TTL	time.Duration
	IdleTTL	time.Duration
	SeenTTL	time.Duration
	Now	func() time.Time
}
func connKey(realm, id string) string	{ return "rt:conn:" + realm + ":" + id }
func idleKey(realm, id string) string	{ return "rt:idle:" + realm + ":" + id }
func seenKey(realm, id string) string	{ return "rt:seen:" + realm + ":" + id }
func (r *Redis) now() time.Time {
	if r.Now != nil {
		return r.Now()
	}
	return time.Now()
}
func (r *Redis) mark(pipe redis.Pipeliner, ctx context.Context, realm, id string) {
	key := connKey(realm, id)
	pipe.HSet(ctx, key, r.Replica, r.now().Add(r.TTL).UnixMilli())
	pipe.PExpire(ctx, key, r.TTL)
}
func (r *Redis) Online(ctx context.Context, realm, id string) error {
	_, err := r.Client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		r.mark(pipe, ctx, realm, id)
		return nil
	})
	return err
}
func (r *Redis) Offline(ctx context.Context, realm, id string) error {
	_, err := r.Client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.HDel(ctx, connKey(realm, id), r.Replica)
		pipe.Set(ctx, seenKey(realm, id), r.now().UnixMilli(), r.SeenTTL)
		return nil
	})
	return err
}
func (r *Redis) Refresh(ctx context.Context, users []hub.User) error {
	if len(users) == 0 {
		return nil
	}
	_, err := r.Client.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		for _, u := range users {
			r.mark(pipe, ctx, u.Realm, u.ID)
		}
		return nil
	})
	return err
}
func (r *Redis) SetIdle(ctx context.Context, realm, id string, idle bool) error {
	if idle {
		return r.Client.Set(ctx, idleKey(realm, id), 1, r.IdleTTL).Err()
	}
	return r.Client.Del(ctx, idleKey(realm, id)).Err()
}
func (r *Redis) States(ctx context.Context, realm string, ids []string) (map[string]Connection, error) {
	type reads struct {
		conn		*redis.MapStringStringCmd
		idle, seen	*redis.StringCmd
	}
	cmds := make(map[string]reads, len(ids))
	_, err := r.Client.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		for _, id := range ids {
			cmds[id] = reads{pipe.HGetAll(ctx, connKey(realm, id)), pipe.Get(ctx, idleKey(realm, id)), pipe.Get(ctx, seenKey(realm, id))}
		}
		return nil
	})
	if err != nil && !errors.Is(err, redis.Nil) {
		return nil, err
	}
	now := r.now().UnixMilli()
	out := make(map[string]Connection, len(ids))
	for id, c := range cmds {
		var state Connection
		for _, raw := range c.conn.Val() {
			if expiry, err := strconv.ParseInt(raw, 10, 64); err == nil && expiry > now {
				state.Online = true
				break
			}
		}
		state.Idle = state.Online && c.idle.Val() != ""
		if ms, err := strconv.ParseInt(c.seen.Val(), 10, 64); err == nil && !state.Online {
			seen := time.UnixMilli(ms).UTC()
			state.LastSeen = &seen
		}
		out[id] = state
	}
	return out, nil
}
type Memory struct {
	mu	sync.Mutex
	online	map[string]int
	idle	map[string]bool
	seen	map[string]time.Time
	Now	func() time.Time
}
func NewMemory() *Memory {
	return &Memory{online: map[string]int{}, idle: map[string]bool{}, seen: map[string]time.Time{}}
}
func key(realm, id string) string	{ return realm + "|" + id }
func (m *Memory) Online(_ context.Context, realm, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.online[key(realm, id)]++
	return nil
}
func (m *Memory) Offline(_ context.Context, realm, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.online, key(realm, id))
	now := time.Now()
	if m.Now != nil {
		now = m.Now()
	}
	m.seen[key(realm, id)] = now.UTC()
	return nil
}
func (m *Memory) Refresh(context.Context, []hub.User) error	{ return nil }
func (m *Memory) SetIdle(_ context.Context, realm, id string, idle bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.idle[key(realm, id)] = idle
	return nil
}
func (m *Memory) States(_ context.Context, realm string, ids []string) (map[string]Connection, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make(map[string]Connection, len(ids))
	for _, id := range ids {
		k := key(realm, id)
		state := Connection{Online: m.online[k] > 0}
		state.Idle = state.Online && m.idle[k]
		if seen, ok := m.seen[k]; ok && !state.Online {
			state.LastSeen = &seen
		}
		out[id] = state
	}
	return out, nil
}
