package httpapi

import (
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	db.RegisterTableRoutes(g, h.svc.Pool(), "workflow", []string{
		"approval_decision", "approval_request", "calendar_event", "contract", "directory_ref",
		"letter_template", "minute_of_meeting", "mom_action_item", "mom_attendee",
		"official_letter", "signature_request", "task",
	})
}
