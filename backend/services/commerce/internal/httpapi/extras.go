package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListCommerceTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/retail/closings", list("retail_closing", "created_at DESC"))
	g.GET("/regions", list("store_region", "code ASC"))
	g.GET("/segments", list("customer_segment", "name ASC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "commerce", []string{
		"coupon", "customer", "customer_address", "customer_auth_code", "customer_segment",
		"customer_session", "retail_closing", "retail_register", "retail_shift", "sales_order",
		"sales_order_event", "sales_order_line", "store_region", "store_settings", "warehouse_ref",
	})
}
