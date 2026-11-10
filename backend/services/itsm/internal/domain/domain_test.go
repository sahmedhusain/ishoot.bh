package domain
import (
	"errors"
	"strings"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func valid() NewTicket {
	return NewTicket{RequesterID: "u1", RequesterName: "Sara", RequesterEmail: "sara@example.test", Category: "hardware",
		Subcategory:	"repair", Title: " Laptop fan ", Description: "Loud noise", AssetRef: "ASSET-1"}
}
func TestNormalize(t *testing.T) {
	n := valid()
	require.NoError(t, n.Normalize(Limits{MaxAttachments: 2}))
	assert.Equal(t, "Laptop fan", n.Title)
	assert.Equal(t, "normal", n.Priority, "the catalogue default applies")
	cases := map[string]func(*NewTicket){
		"category":	func(n *NewTicket) { n.Category = "facilities" },
		"subcategory":	func(n *NewTicket) { n.Subcategory = "vpn" },
		"priority":	func(n *NewTicket) { n.Priority = "urgent" },
		"title":	func(n *NewTicket) { n.Title = strings.Repeat("x", 201) },
		"description":	func(n *NewTicket) { n.Description = "  " },
		"assetRef":	func(n *NewTicket) { n.Category, n.Subcategory = "access", "new_access" },
		"requester":	func(n *NewTicket) { n.RequesterEmail = "" },
		"attachments": func(n *NewTicket) {
			n.Attachments = []Attachment{{FileURL: "https://evil.test/a.pdf", FileName: "a", Size: 1}}
		},
	}
	for field, mutate := range cases {
		t.Run(field, func(t *testing.T) {
			n := valid()
			mutate(&n)
			var ve *ValidationError
			require.ErrorAs(t, n.Normalize(Limits{MaxAttachments: 2}), &ve)
			assert.Equal(t, field, ve.Field)
		})
	}
	n = valid()
	n.Attachments = make([]Attachment, 3)
	assert.Error(t, n.Normalize(Limits{MaxAttachments: 2}))
}
func TestApply(t *testing.T) {
	now := time.Date(2026, 11, 1, 9, 0, 0, 0, time.UTC)
	s := State{Status: InitialStatus()}
	_, err := Apply(s, "assign", true, "it1", "Ali", now)
	assert.ErrorIs(t, err, ErrForbidden, "requesters cannot assign")
	_, err = Apply(s, "assign", false, "", "", now)
	var ve *ValidationError
	assert.ErrorAs(t, err, &ve)
	assigned, err := Apply(s, "assign", false, "it1", "Ali", now)
	require.NoError(t, err)
	assert.Equal(t, "assigned", assigned.Status)
	assert.Equal(t, "it1", *assigned.AssigneeID)
	require.NotNil(t, assigned.FirstResponseAt, "IT's first action counts as the response")
	resolved, err := Apply(assigned, "resolve", false, "", "", now)
	require.NoError(t, err)
	require.NotNil(t, resolved.ResolvedAt)
	reopened, err := Apply(resolved, "reopen", true, "", "", now)
	require.NoError(t, err)
	assert.Nil(t, reopened.ResolvedAt)
	assert.Equal(t, "assigned", reopened.Status)
	_, err = Apply(State{Status: "closed"}, "start", false, "", "", now)
	assert.True(t, errors.Is(err, ErrTransition))
	cancelled, err := Apply(s, "cancel", true, "", "", now)
	require.NoError(t, err)
	assert.NotNil(t, cancelled.ClosedAt)
	assert.Nil(t, cancelled.FirstResponseAt, "a requester's own action is not an IT response")
}
func TestPolicy(t *testing.T) {
	p := Policy{Priority: "high", ResponseMinutes: 60, ResolveMinutes: 120}
	require.NoError(t, p.Validate())
	at := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	r, s := p.Deadlines(at)
	assert.Equal(t, at.Add(time.Hour), r)
	assert.Equal(t, at.Add(2*time.Hour), s)
	assert.Error(t, Policy{Priority: "high", ResponseMinutes: 60, ResolveMinutes: 30}.Validate())
	assert.Error(t, Policy{Priority: "nope", ResponseMinutes: 1, ResolveMinutes: 1}.Validate())
}
