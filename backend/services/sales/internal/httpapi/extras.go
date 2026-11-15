package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListSalesTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/canned-replies", list("canned_reply", "title ASC"))
	g.GET("/request-events", list("request_event", "created_at DESC"))
	g.GET("/request-comments", list("request_comment", "created_at DESC"))
	g.GET("/request-assignments", list("request_assignment", "assigned_at DESC"))
	g.GET("/attribution-changes", list("sales_attribution_change", "created_at DESC"))
	g.GET("/client-contacts", list("client_contact_person", "name ASC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "sales", []string{
		"campaign", "catalog_item_ref", "contact", "crm_contact", "crm_deal", "deal",
		"deal_pipeline_stage", "inquiry", "quotation", "quotation_item", "quotation_line_item",
		"sales_attribution_change",
	})
}
