package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListCMSTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/social/plans", list("social_content_plan", "created_at DESC"))
	g.GET("/social/posts", list("social_post", "created_at DESC"))
	g.GET("/social/metrics", list("social_metric", "recorded_at DESC"))
	g.GET("/social/snapshots", list("social_insight_snapshot", "recorded_at DESC"))
	g.GET("/social/post-snapshots", list("social_post_snapshot", "recorded_at DESC"))
	g.GET("/social/links", list("social_link", "display_order ASC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "cms", []string{
		"article", "content_snapshot", "faq", "page", "portfolio_category", "portfolio_item",
		"review", "social_content_plan", "social_insight_snapshot", "social_link",
		"social_metric", "social_post", "social_post_snapshot", "statistic", "website_content",
	})
}
