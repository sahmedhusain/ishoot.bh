package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListNotifyTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/admin/notifications", list("notification", "created_at DESC"))
	g.GET("/admin/messages", list("message", "created_at DESC"))
	g.GET("/admin/category-settings", list("category_setting", "category ASC"))
	g.GET("/admin/preferences", list("preference", "updated_at DESC"))
	g.GET("/admin/mutes", list("mute", "created_at DESC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "notify", []string{
		"attachment", "category_setting", "message", "mute", "notification", "preference",
	})
}
