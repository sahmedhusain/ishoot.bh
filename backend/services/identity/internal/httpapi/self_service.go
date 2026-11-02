package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
)

// RegisterSelfService exposes a staff member's or customer's own sessions and password, with their access token.
func RegisterSelfService(e *echo.Echo, verifier *authn.Verifier, svc *app.SelfService, bodyLimit int64) {
	g := e.Group("/v1/identity/me", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store")
			return next(c)
		}
	}, authn.Require(verifier, authn.RealmStaff, authn.RealmCustomer))
	principal := func(c echo.Context) authn.Principal {
		p, _ := authn.PrincipalFrom(c.Request().Context())
		return p
	}
	g.GET("", func(c echo.Context) error {
		out, err := svc.Security(c.Request().Context(), principal(c))
		if err != nil {
			return selfError(err)
		}
		return c.JSON(http.StatusOK, out)
	})
	g.DELETE("", func(c echo.Context) error {
		if err := svc.DeleteCustomer(c.Request().Context(), principal(c)); err != nil {
			return selfError(err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	g.GET("/sessions", func(c echo.Context) error {
		items, err := svc.Sessions(c.Request().Context(), principal(c))
		if err != nil {
			return selfError(err)
		}
		return c.JSON(http.StatusOK, map[string]any{"items": items})
	})
	g.DELETE("/sessions/:id", func(c echo.Context) error {
		if err := svc.Revoke(c.Request().Context(), principal(c), c.Param("id")); err != nil {
			return selfError(err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	g.DELETE("/sessions", func(c echo.Context) error {
		if err := svc.RevokeOthers(c.Request().Context(), principal(c)); err != nil {
			return selfError(err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	g.PUT("/password", func(c echo.Context) error {
		var in struct {
			CurrentPassword string `json:"currentPassword" validate:"required,max=1024"`
			NewPassword     string `json:"newPassword" validate:"required,max=1024"`
			Code            string `json:"code" validate:"max=64"`
			ClientIP        string `json:"clientIp" validate:"max=45"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		err := svc.ChangePassword(c.Request().Context(), principal(c), in.CurrentPassword, in.NewPassword, in.Code, in.ClientIP)
		if errors.Is(err, accounts.ErrMFARequired) {
			return problem.New(http.StatusUnauthorized, "mfa_required", "")
		}
		if errors.Is(err, accounts.ErrInvalid) {
			return problem.New(http.StatusUnprocessableEntity, "password_rejected", "")
		}
		if err != nil {
			return selfError(err)
		}
		return c.NoContent(http.StatusNoContent)
	})
}

func selfError(err error) error {
	switch {
	case errors.Is(err, accounts.ErrForbidden):
		return problem.Forbidden("")
	case errors.Is(err, accounts.ErrInvalid):
		return problem.Unauthenticated("")
	case errors.Is(err, app.ErrNotFound):
		return problem.NotFound("")
	default:
		return err
	}
}
