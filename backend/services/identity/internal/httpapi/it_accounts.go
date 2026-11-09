package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
)

func RegisterITAccounts(e *echo.Echo, verifier *authn.Verifier, svc *app.ITAccounts, bodyLimit int64) {
	// IT Accounts endpoints
	g := e.Group("/v1/identity/desk/it-accounts", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store")
			return next(c)
		}
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
		page, err := svc.List(c.Request().Context(), actor, c.QueryParam("cursor"), int32(limit))
		if err != nil {
			return itAccountError(err)
		}
		return c.JSON(http.StatusOK, page)
	}, authz.Require(catalog.ITAccess, "it_accounts", "read"))

	g.POST("", func(c echo.Context) error {
		var in struct {
			Email       string  `json:"email" validate:"required,max=254"`
			Password    string  `json:"password" validate:"required,max=1024"`
			Role        string  `json:"role" validate:"required,max=100"`
			ReportingTo *string `json:"reportingTo,omitempty"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		result, err := svc.Create(c.Request().Context(), actor, in.Email, in.Password, in.Role, in.ReportingTo)
		if err != nil {
			return itAccountError(err)
		}
		return c.JSON(http.StatusCreated, result)
	}, authz.Require(catalog.ITAccess, "it_accounts", "create"))

	g.PUT("/:id", func(c echo.Context) error {
		var in struct {
			Role        string  `json:"role" validate:"required,max=100"`
			Active      *bool   `json:"active" validate:"required"`
			ReportingTo *string `json:"reportingTo,omitempty"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := svc.Update(c.Request().Context(), actor, c.Param("id"), in.Role, *in.Active, in.ReportingTo); err != nil {
			return itAccountError(err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "it_accounts", "edit"))

	// IT Roles endpoints
	r := e.Group("/v1/identity/desk/it-roles", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store")
			return next(c)
		}
	}, authn.Require(verifier, authn.RealmIT))

	r.GET("", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		roles, err := svc.Roles(c.Request().Context(), actor)
		if err != nil {
			return itAccountError(err)
		}
		return c.JSON(http.StatusOK, map[string]any{"items": roles})
	}, authz.Require(catalog.ITAccess, "staff_roles", "read"))

	r.POST("", func(c echo.Context) error {
		var in app.ITRoleDraft
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := svc.SaveRole(c.Request().Context(), actor, in, true); err != nil {
			return itAccountError(err)
		}
		return c.NoContent(http.StatusCreated)
	}, authz.Require(catalog.ITAccess, "staff_roles", "create"))

	r.PUT("/:id", func(c echo.Context) error {
		var in app.ITRoleDraft
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		if in.ID == "" {
			in.ID = c.Param("id")
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := svc.SaveRole(c.Request().Context(), actor, in, false); err != nil {
			return itAccountError(err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "staff_roles", "edit"))

	r.DELETE("/:id", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := svc.DeleteRole(c.Request().Context(), actor, c.Param("id")); err != nil {
			return itAccountError(err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "staff_roles", "delete"))
}

func itAccountError(err error) error {
	var pgerr *pgconn.PgError
	switch {
	case errors.Is(err, accounts.ErrForbidden):
		return problem.Forbidden("")
	case errors.Is(err, accounts.ErrInvalid):
		return problem.Unauthenticated("")
	case errors.Is(err, app.ErrValidation):
		return problem.Validation()
	case errors.Is(err, app.ErrNotFound):
		return problem.NotFound("")
	case errors.Is(err, app.ErrLastAdmin):
		return problem.New(http.StatusConflict, "last_it_admin", "")
	case errors.Is(err, app.ErrRoleAssigned):
		return problem.New(http.StatusConflict, "role_assigned", "")
	case errors.Is(err, app.ErrRoleExists):
		return problem.New(http.StatusConflict, "role_exists", "")
	case errors.As(err, &pgerr) && pgerr.Code == "23505":
		return problem.New(http.StatusConflict, "account_exists", "")
	default:
		return err
	}
}
