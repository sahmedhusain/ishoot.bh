package catalog

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNotificationCategoryFor(t *testing.T) {
	for _, tc := range []struct{ realm, key, entity, want string }{
		{"staff", "approvals.notifications.awaitingYou", "leave_request", "approvals"},
		{"staff", "tasks.notifications.assigned", "task", "tasks"},
		{"staff", "", "sales_order", "sales"},
		{"staff", "inventory.notifications.lowStock", "product", "inventory"},
		{"staff", "unknown.key", "unknown", "system"},
		{"it", "approvals.notifications.awaitingYou", "", "system"}, // approvals are a staff category
		{"it", "", "ticket", "it_tickets"},
	} {
		assert.Equal(t, tc.want, Notifications.CategoryFor(tc.realm, tc.key, tc.entity), "%+v", tc)
	}
}

func TestNotificationCategoryAllowedFor(t *testing.T) {
	finance, _ := Notifications.Category("finance")
	approvals, _ := Notifications.Category("approvals")
	desk, _ := Notifications.Category("it_tickets")
	none := func(string, string) bool { return false }
	payments := func(resource, action string) bool { return resource == "payments" && action == "read" }
	assert.False(t, finance.AllowedFor("staff", none), "a role category needs one of its permissions")
	assert.True(t, finance.AllowedFor("staff", payments))
	assert.True(t, approvals.AllowedFor("staff", none), "a personal category needs no permission")
	assert.False(t, approvals.AllowedFor("it", none), "a category belongs to its realms")
	assert.True(t, desk.AllowedFor("it", func(r, a string) bool { return ITAccess.DefaultAllows("it_support", r, a) }))
	assert.False(t, desk.AllowedFor("it", func(r, a string) bool { return ITAccess.DefaultAllows("it_auditor", r, a) && r != "tickets" }))
	security, _ := Notifications.Category("security")
	assert.True(t, security.Mandatory)
}

func TestPresence(t *testing.T) {
	assert.Equal(t, "in_meeting", Presence.Automatic("calendar"))
	assert.Equal(t, "offline", Presence.Automatic("disconnected"))
	status, ok := Presence.WindowStatus("leave")
	assert.True(t, ok)
	assert.Equal(t, "on_leave", status)
	dnd, _ := Presence.Status("do_not_disturb")
	assert.True(t, dnd.Silences)
}
