package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListITSMTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/asset-categories", list("asset_category", "name_en ASC"))
	g.GET("/support-programs", list("support_program", "name_en ASC"))
	g.GET("/support-reimbursements", list("support_reimbursement", "created_at DESC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "itsm", []string{
		"asset", "asset_category", "asset_handover", "sla_policy", "staff_ref",
		"support_program", "support_program_rule", "support_reimbursement",
		"task", "task_comment", "ticket", "ticket_attachment", "ticket_comment", "ticket_event",
	})
}
