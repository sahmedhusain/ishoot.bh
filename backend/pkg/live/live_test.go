package live

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSubjects(t *testing.T) {
	subject, err := UserSubject("staff", "7d6f9d1e-0c55-4c8e-9a5c-2f8a3c1b9e10")
	require.NoError(t, err)
	assert.Equal(t, "live.user.staff.7d6f9d1e-0c55-4c8e-9a5c-2f8a3c1b9e10", subject)
	target, ok := ParseSubject(subject)
	require.True(t, ok)
	assert.Equal(t, Target{Realm: "staff", ID: "7d6f9d1e-0c55-4c8e-9a5c-2f8a3c1b9e10"}, target)

	subject, err = TopicSubject("it.tickets")
	require.NoError(t, err)
	target, ok = ParseSubject(subject)
	require.True(t, ok)
	assert.Equal(t, "it.tickets", target.Topic)

	for _, bad := range []struct{ realm, id string }{{"customer", "x"}, {"staff", "a.b"}, {"staff", "*"}, {"staff", ">"}, {"it", ""}} {
		_, err := UserSubject(bad.realm, bad.id)
		assert.ErrorIs(t, err, ErrInvalid, "%+v", bad)
	}
	for _, bad := range []string{"", "IT.tickets", "it..tickets", "it.*", "it.>", "a b"} {
		_, err := TopicSubject(bad)
		assert.ErrorIs(t, err, ErrInvalid, bad)
	}
	_, ok = ParseSubject("live.user.customer.1")
	assert.False(t, ok)
}

func TestEvents(t *testing.T) {
	ev, err := New("notification.created", map[string]string{"id": "1"})
	require.NoError(t, err)
	assert.JSONEq(t, `{"id":"1"}`, string(ev.Data))
	_, err = New("Bad Type", nil)
	assert.ErrorIs(t, err, ErrInvalid)
	_, err = New("big", map[string]string{"x": strings.Repeat("a", MaxData)})
	assert.ErrorIs(t, err, ErrInvalid)

	var r Recorder
	require.NoError(t, r.ToUser(context.Background(), "it", "u1", ev))
	assert.Error(t, r.ToTopic(context.Background(), "it.*", ev))
	require.Len(t, r.Sent, 1)
	assert.Equal(t, "u1", r.Sent[0].Target.ID)
}
