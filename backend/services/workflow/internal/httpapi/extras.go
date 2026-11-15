package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListWorkflowTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/approval-policies", list("approval_policy", "name_en ASC"))
	g.GET("/approval-policy-steps", list("approval_policy_step", "step_order ASC"))
	g.GET("/signature-policies", list("signature_policy", "name_en ASC"))
	g.GET("/calendar-feed-tokens", list("calendar_feed_token", "created_at DESC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "workflow", []string{
		"approval_decision", "approval_request", "calendar_event", "contract", "directory_ref",
		"letter_template", "minute_of_meeting", "mom_action_item", "mom_attendee",
		"official_letter", "signature_request", "task",
	})
}
