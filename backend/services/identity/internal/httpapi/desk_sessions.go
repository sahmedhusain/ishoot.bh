package httpapi
import (
	"net/http"
	"strconv"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/app"
)
func RegisterDeskSessions(e *echo.Echo, verifier *authn.Verifier, svc *app.DeskSessions) {
	g := e.Group("/v1/identity/desk/sessions", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error { c.Response().Header().Set("Cache-Control", "no-store"); return next(c) }
	}, authn.Require(verifier, authn.RealmIT))
	g.GET("", func(c echo.Context) error {
		limit := 50
		if raw := c.QueryParam("limit"); raw != "" {
			n, err := strconv.Atoi(raw)
			if err != nil || n < 1 || n > 200 {
				return problem.Validation()
			}
			limit = n
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		page, err := svc.List(c.Request().Context(), actor, c.QueryParam("realm"), c.QueryParam("subjectId"), c.QueryParam("cursor"), int32(limit))
		if err != nil {
			return itAccountError(err)
		}
		return c.JSON(http.StatusOK, page)
	}, authz.Require(catalog.ITAccess, "sessions", "read"))
	g.DELETE("/:id", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := svc.Revoke(c.Request().Context(), actor, c.Param("id")); err != nil {
			return itAccountError(err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "sessions", "delete"))
}
