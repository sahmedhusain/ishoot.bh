package httpapi
import (
	"errors"
	"net/http"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/app"
)
func multiRequire(v1, v2 *authn.Verifier, realms ...authn.Realm) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := authn.BearerToken(c.Request().Header.Get(echo.HeaderAuthorization))
			if token == "" {
				return problem.Unauthenticated("")
			}
			p, err := v1.Verify(c.Request().Context(), token, realms...)
			if err != nil && v2 != nil {
				p, err = v2.Verify(c.Request().Context(), token, realms...)
			}
			if err != nil {
				return problem.Unauthenticated("")
			}
			ctx := authn.WithPrincipal(c.Request().Context(), p)
			c.SetRequest(c.Request().WithContext(ctx))
			return next(c)
		}
	}
}
func RegisterStaffAccess(e *echo.Echo, userVerifier, serviceVerifier *authn.Verifier, svc *app.StaffAccess) {
	e.GET("/v1/identity/staff/access", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		policy, err := svc.Read(c.Request().Context(), actor)
		if errors.Is(err, app.ErrPolicyUnavailable) {
			return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
		}
		if err != nil {
			return itAccountError(err)
		}
		return c.JSON(http.StatusOK, policy)
	}, func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error { c.Response().Header().Set("Cache-Control", "no-store"); return next(c) }
	}, authn.Require(userVerifier, authn.RealmStaff))
	e.GET("/v1/identity/staff/roles", func(c echo.Context) error {
		c.Response().Header().Set("Cache-Control", "no-store")
		roles, err := svc.ListRoles(c.Request().Context())
		if err != nil {
			return problem.New(http.StatusInternalServerError, problem.CodeUnavailable, err.Error())
		}
		return c.JSON(http.StatusOK, map[string]any{"items": roles})
	}, multiRequire(userVerifier, serviceVerifier, authn.RealmStaff, authn.RealmService, authn.RealmIT))
}
func RegisterStaffAccessService(e *echo.Echo, verifier *authn.Verifier, svc *app.StaffAccess) {
	e.GET("/v1/identity/staff/accounts/:id/access", func(c echo.Context) error {
		p, _ := authn.PrincipalFrom(c.Request().Context())
		if p.Subject != "admin" {
			return problem.Forbidden("")
		}
		c.Response().Header().Set("Cache-Control", "no-store")
		policy, err := svc.ReadSubject(c.Request().Context(), c.Param("id"))
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusOK, policy)
	}, authn.Require(verifier, authn.RealmService))
}
