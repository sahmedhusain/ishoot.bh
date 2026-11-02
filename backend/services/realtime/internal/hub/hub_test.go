package hub

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRouting(t *testing.T) {
	h := New(2)
	a1 := NewConn("1", "staff", "alice", "s1", []string{"presence.staff", "it.tickets"}, 2)
	a2 := NewConn("2", "staff", "alice", "s2", []string{"presence.staff"}, 2)
	b := NewConn("3", "it", "alice", "s3", []string{"it.tickets"}, 2)
	first, ok := h.Add(a1)
	require.True(t, ok)
	assert.True(t, first)
	first, ok = h.Add(a2)
	require.True(t, ok)
	assert.False(t, first)
	_, ok = h.Add(NewConn("4", "staff", "alice", "", nil, 2))
	assert.False(t, ok, "at most two streams per person")
	_, ok = h.Add(b)
	require.True(t, ok, "the same ID in another realm is another person")

	assert.Equal(t, 2, h.ToUser("staff", "alice", []byte("x")))
	assert.Equal(t, 2, h.ToTopic("it.tickets", []byte("y")))
	assert.Equal(t, 0, h.ToTopic("nobody", []byte("z")))
	assert.Equal(t, []byte("x"), <-a1.Send())
	assert.Equal(t, []byte("y"), <-a1.Send())
	assert.Len(t, h.Users(), 2)
	assert.Equal(t, 3, h.Count())

	assert.Equal(t, 1, h.CloseSession("s2"))
	<-a2.Closed()
	assert.Equal(t, ReasonSession, a2.Reason())
	assert.False(t, h.Remove(a2))
	assert.True(t, h.Remove(a1))
	assert.False(t, h.Remove(a1), "removing twice changes nothing")
}

func TestSlowConnectionIsClosed(t *testing.T) {
	h := New(5)
	c := NewConn("1", "staff", "bob", "", nil, 1)
	_, ok := h.Add(c)
	require.True(t, ok)
	assert.Equal(t, 1, h.ToUser("staff", "bob", []byte("1")))
	assert.Equal(t, 0, h.ToUser("staff", "bob", []byte("2")), "the buffer is full")
	<-c.Closed()
	assert.Equal(t, ReasonSlow, c.Reason())
}
