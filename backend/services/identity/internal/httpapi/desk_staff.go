package httpapi
import (
	"errors"
	"net/http"
	"strconv"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
)
func RegisterDeskStaff(e *echo.Echo, verifier *authn.Verifier, svc *app.DeskStaff, bodyLimit int64) {
	g := e.Group("/v1/identity/desk", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error { c.Response().Header().Set("Cache-Control", "no-store"); return next(c) }
	}, authn.Require(verifier, authn.RealmIT))
	actor := func(c echo.Context) authn.Principal { p, _ := authn.PrincipalFrom(c.Request().Context()); return p }
	limit := func(c echo.Context) (int32, error) {
		n := 50
		if raw := c.QueryParam("limit"); raw != "" {
			var err error
			n, err = strconv.Atoi(raw)
			if err != nil || n < 1 || n > 200 {
				return 0, problem.Validation()
			}
		}
		return int32(n), nil
	}
	g.GET("/staff-accounts", func(c echo.Context) error {
		n, err := limit(c)
		if err != nil {
			return err
		}
		out, err := svc.List(c.Request().Context(), actor(c), c.QueryParam("cursor"), n)
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "staff_accounts", "read"))
	g.GET("/staff-accounts/:id", func(c echo.Context) error {
		out, err := svc.Read(c.Request().Context(), actor(c), c.Param("id"))
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "staff_accounts", "read"))
	g.GET("/staff-accounts/:id/access", func(c echo.Context) error {
		out, err := svc.CopyAccess(c.Request().Context(), actor(c), c.Param("id"))
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "staff_accounts", "read"))
	save := func(c echo.Context) error {
		var in struct {
			app.StaffDraft
			Active	*bool	`json:"active" validate:"required"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		in.StaffDraft.Active = *in.Active
		id, err := svc.Save(c.Request().Context(), actor(c), c.Param("id"), in.StaffDraft)
		if err != nil {
			return staffDeskError(c, err)
		}
		status := http.StatusOK
		if c.Param("id") == "" {
			status = http.StatusCreated
		}
		return c.JSON(status, map[string]string{"subjectId": id})
	}
	g.POST("/staff-accounts", save, authz.Require(catalog.ITAccess, "staff_accounts", "create"))
	g.PUT("/staff-accounts/:id", save, authz.Require(catalog.ITAccess, "staff_accounts", "edit"))
	g.POST("/staff-accounts/:id/invitations", func(c echo.Context) error {
		out, err := svc.Invite(c.Request().Context(), actor(c), c.Param("id"))
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusCreated, out)
	}, authz.Require(catalog.ITAccess, "staff_accounts", "execute"))
	g.DELETE("/staff-accounts/:id/mfa", func(c echo.Context) error {
		if err := svc.ResetMFA(c.Request().Context(), actor(c), c.Param("id")); err != nil {
			return staffDeskError(c, err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "staff_accounts", "execute"))
	g.POST("/staff-access/preview", func(c echo.Context) error {
		var in app.AccessTemplate
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		out, err := svc.Preview(c.Request().Context(), actor(c), in)
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "staff_accounts", "read"))
	g.GET("/staff-roles", func(c echo.Context) error {
		n, err := limit(c)
		if err != nil {
			return err
		}
		out, err := svc.Roles(c.Request().Context(), actor(c), c.QueryParam("cursor"), n)
		if err != nil {
			return staffDeskError(c, err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "staff_roles", "read"))
	saveRole := func(create bool) echo.HandlerFunc {
		return func(c echo.Context) error {
			var in app.StaffRoleDraft
			if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
				return err
			}
			if !create {
				if in.ID != "" && in.ID != c.Param("id") {
					return problem.Validation()
				}
				in.ID = c.Param("id")
			}
			if err := svc.SaveRole(c.Request().Context(), actor(c), in, create); err != nil {
				return staffDeskError(c, err)
			}
			return c.NoContent(http.StatusNoContent)
		}
	}
	g.POST("/staff-roles", saveRole(true), authz.Require(catalog.ITAccess, "staff_roles", "create"))
	g.PUT("/staff-roles/:id", saveRole(false), authz.Require(catalog.ITAccess, "staff_roles", "edit"))
	g.DELETE("/staff-roles/:id", func(c echo.Context) error {
		if err := svc.DeleteRole(c.Request().Context(), actor(c), c.Param("id")); err != nil {
			return staffDeskError(c, err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "staff_roles", "delete"))
}
func staffDeskError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, accounts.ErrForbidden):
		return problem.Forbidden("")
	case errors.Is(err, accounts.ErrInvalid):
		return problem.Unauthenticated("")
	case errors.Is(err, app.ErrRoleAssigned):
		return problem.New(http.StatusConflict, "role_assigned", "")
	case errors.Is(err, app.ErrRoleExists):
		return problem.New(http.StatusConflict, "role_exists", "")
	case errors.Is(err, app.ErrPolicyUnavailable):
		return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
	default:
		return managedError(c, err)
	}
}
