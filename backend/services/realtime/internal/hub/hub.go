// Package hub keeps this replica's open streams and routes hints to them: by person, by topic, and by session (to
// close the streams of a revoked session). Every replica receives every hint from NATS and writes it only to the
// connections it holds, so replicas share nothing.
package hub

import (
	"slices"
	"sync"
)

// Conn is one open stream.
type Conn struct {
	ID        string
	Realm     string
	UserID    string
	SessionID string
	Topics    []string

	send   chan []byte
	closed chan struct{}
	reason string
	once   sync.Once
}

// NewConn returns a connection with room for buffer queued hints.
func NewConn(id, realm, userID, sessionID string, topics []string, buffer int) *Conn {
	return &Conn{ID: id, Realm: realm, UserID: userID, SessionID: sessionID, Topics: topics,
		send: make(chan []byte, buffer), closed: make(chan struct{})}
}

// Send returns the hints to write.
func (c *Conn) Send() <-chan []byte { return c.send }

// Closed is closed when the hub dropped the connection (slow, or its session ended).
func (c *Conn) Closed() <-chan struct{} { return c.closed }

// Reason says why the hub closed the connection.
func (c *Conn) Reason() string { return c.reason }

func (c *Conn) close(reason string) {
	c.once.Do(func() {
		c.reason = reason
		close(c.closed)
	})
}

// Close reasons.
const (
	ReasonSlow    = "slow"
	ReasonSession = "session_ended"
)

func userKey(realm, id string) string { return realm + "|" + id }

// Hub routes hints to this replica's connections.
type Hub struct {
	mu        sync.RWMutex
	byUser    map[string]map[*Conn]struct{}
	byTopic   map[string]map[*Conn]struct{}
	bySession map[string]map[*Conn]struct{}
	maxPerUse int
}

// New returns an empty hub allowing maxPerUser streams per person.
func New(maxPerUser int) *Hub {
	return &Hub{byUser: map[string]map[*Conn]struct{}{}, byTopic: map[string]map[*Conn]struct{}{},
		bySession: map[string]map[*Conn]struct{}{}, maxPerUse: maxPerUser}
}

func add(m map[string]map[*Conn]struct{}, key string, c *Conn) {
	set, ok := m[key]
	if !ok {
		set = map[*Conn]struct{}{}
		m[key] = set
	}
	set[c] = struct{}{}
}

func remove(m map[string]map[*Conn]struct{}, key string, c *Conn) {
	if set, ok := m[key]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(m, key)
		}
	}
}

// Add registers a connection. ok is false when the person already holds the most streams allowed; first is true
// when it is the person's first stream on this replica.
func (h *Hub) Add(c *Conn) (first, ok bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	key := userKey(c.Realm, c.UserID)
	if len(h.byUser[key]) >= h.maxPerUse {
		return false, false
	}
	first = len(h.byUser[key]) == 0
	add(h.byUser, key, c)
	for _, t := range c.Topics {
		add(h.byTopic, t, c)
	}
	if c.SessionID != "" {
		add(h.bySession, c.SessionID, c)
	}
	return first, true
}

// Remove unregisters a connection; last is true when the person has no other stream on this replica.
func (h *Hub) Remove(c *Conn) (last bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	key := userKey(c.Realm, c.UserID)
	if _, ok := h.byUser[key][c]; !ok {
		return false
	}
	remove(h.byUser, key, c)
	for _, t := range c.Topics {
		remove(h.byTopic, t, c)
	}
	if c.SessionID != "" {
		remove(h.bySession, c.SessionID, c)
	}
	return len(h.byUser[key]) == 0
}

func deliver(set map[*Conn]struct{}, payload []byte) int {
	n := 0
	for c := range set {
		select {
		case c.send <- payload:
			n++
		default:
			c.close(ReasonSlow) // the stream reconnects and resyncs
		}
	}
	return n
}

// ToUser queues a hint for one person's connections and returns how many got it.
func (h *Hub) ToUser(realm, id string, payload []byte) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return deliver(h.byUser[userKey(realm, id)], payload)
}

// ToTopic queues a hint for every connection following topic.
func (h *Hub) ToTopic(topic string, payload []byte) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return deliver(h.byTopic[topic], payload)
}

// CloseSession closes the streams of a session that ended.
func (h *Hub) CloseSession(sessionID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	n := 0
	for c := range h.bySession[sessionID] {
		c.close(ReasonSession)
		n++
	}
	return n
}

// User is a person with at least one stream here.
type User struct{ Realm, ID string }

// Users lists the people connected to this replica.
func (h *Hub) Users() []User {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make([]User, 0, len(h.byUser))
	for _, set := range h.byUser {
		for c := range set {
			out = append(out, User{Realm: c.Realm, ID: c.UserID})
			break
		}
	}
	slices.SortFunc(out, func(a, b User) int {
		if a.Realm != b.Realm {
			return compare(a.Realm, b.Realm)
		}
		return compare(a.ID, b.ID)
	})
	return out
}

func compare(a, b string) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	}
	return 0
}

// Count is the number of open streams.
func (h *Hub) Count() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	n := 0
	for _, set := range h.byUser {
		n += len(set)
	}
	return n
}
