package httpapi

import (
	"errors"
	"net/http"
	"slices"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/app"
)

// RegisterManagedAccounts exposes the staff and customer account endpoints to the app allowed for each realm
// (IDENTITY_CALLERS_*), with service tokens only.
func RegisterManagedAccounts(e *echo.Echo, verifier *authn.Verifier, svc *app.ManagedAccounts, callers map[authn.Realm][]string, bodyLimit int64) {
	g := e.Group("/v1/identity/:realm", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store")
			return next(c)
		}
	}, authn.Require(verifier, authn.RealmService))
	realmOf := func(c echo.Context) (authn.Realm, string, error) {
		r, err := authn.ParseRealm(c.Param("realm"))
		if err != nil || (r != authn.RealmStaff && r != authn.RealmCustomer) {
			return "", "", problem.NotFound("")
		}
		p, ok := authn.PrincipalFrom(c.Request().Context())
		if !ok || !slices.Contains(callers[r], p.Subject) {
			return "", "", problem.Forbidden("")
		}
		return r, p.Subject, nil
	}
	actor := func(caller, person string) string {
		if person == "" {
			return caller
		}
		return caller + ":" + person
	}

	g.GET("/password-policy", func(c echo.Context) error {
		realm, _, err := realmOf(c)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, map[string]int{"minLength": svc.PasswordMinimum(realm)})
	})

	g.POST("/accounts", func(c echo.Context) error {
		r, caller, err := realmOf(c)
		if err != nil {
			return err
		}
		if r != authn.RealmCustomer {
			return problem.NotFound("")
		}
		var in struct {
			Email    string `json:"email" validate:"required,max=254"`
			Password string `json:"password" validate:"required,max=1024"`
			ClientIP string `json:"clientIp" validate:"max=45"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		id, err := svc.RegisterCustomer(c.Request().Context(), in.Email, in.Password, caller, in.ClientIP)
		if err != nil {
			return managedError(c, err)
		}
		return c.JSON(http.StatusCreated, map[string]string{"subjectId": id})
	})

	g.PUT("/accounts/:id", func(c echo.Context) error {
		r, caller, err := realmOf(c)
		if err != nil {
			return err
		}
		var in struct {
			Email    string   `json:"email" validate:"required,max=254"`
			Username string   `json:"username" validate:"max=64"`
			Roles    []string `json:"roles" validate:"max=20,dive,required,max=100"`
			Active   *bool    `json:"active" validate:"required"`
			ActorID  string   `json:"actorId" validate:"max=64"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		created, err := svc.Sync(c.Request().Context(), r, c.Param("id"), app.AccountInput{Email: in.Email, Username: in.Username, Roles: in.Roles, Active: *in.Active}, actor(caller, in.ActorID))
		if err != nil {
			return managedError(c, err)
		}
		return c.JSON(http.StatusOK, map[string]bool{"created": created})
	})
	g.PUT("/accounts/:id/password", func(c echo.Context) error {
		r, caller, err := realmOf(c)
		if err != nil {
			return err
		}
		var in struct {
			Password      string `json:"password" validate:"required,max=1024"`
			KeepSessionID string `json:"keepSessionId" validate:"max=64"`
			ActorID       string `json:"actorId" validate:"max=64"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		if err := svc.SetPassword(c.Request().Context(), r, c.Param("id"), in.Password, in.KeepSessionID, actor(caller, in.ActorID)); err != nil {
			return managedError(c, err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	g.DELETE("/accounts/:id/mfa", func(c echo.Context) error {
		r, caller, err := realmOf(c)
		if err != nil {
			return err
		}
		if err := svc.ResetMFA(c.Request().Context(), r, c.Param("id"), actor(caller, c.QueryParam("actorId"))); err != nil {
			return managedError(c, err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	g.POST("/password-resets", func(c echo.Context) error {
		r, _, err := realmOf(c)
		if err != nil {
			return err
		}
		var in struct {
			Email    string `json:"email" validate:"required,max=254"`
			ClientIP string `json:"clientIp" validate:"max=45"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		out, err := svc.RequestReset(c.Request().Context(), r, in.Email, in.ClientIP)
		if err != nil {
			return managedError(c, err)
		}
		return c.JSON(http.StatusCreated, out)
	})
	g.POST("/password-resets/confirm", func(c echo.Context) error {
		r, _, err := realmOf(c)
		if err != nil {
			return err
		}
		var in struct {
			Token    string `json:"token" validate:"required,max=64"`
			Email    string `json:"email" validate:"max=254"`
			ClientIP string `json:"clientIp" validate:"max=45"`
			Password string `json:"password" validate:"required,max=1024"`
		}
		if err := httpx.BindJSON(c, &in, bodyLimit); err != nil {
			return err
		}
		id, err := svc.ConfirmReset(c.Request().Context(), r, in.Token, in.Password, in.Email, in.ClientIP)
		if err != nil {
			return managedError(c, err)
		}
		return c.JSON(http.StatusOK, map[string]string{"subjectId": id})
	})
}

func managedError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, app.ErrValidation):
		return problem.Validation()
	case errors.Is(err, app.ErrNotFound):
		return problem.New(http.StatusNotFound, "account_not_found", "")
	case errors.Is(err, app.ErrLastStaffAdmin):
		return problem.New(http.StatusConflict, "last_staff_admin", "")
	case errors.Is(err, app.ErrEmailTaken):
		return problem.New(http.StatusConflict, "email_taken", "")
	case errors.Is(err, app.ErrResetInvalid):
		return problem.New(http.StatusUnprocessableEntity, "reset_invalid", "")
	default:
		return mfaError(c, err)
	}
}
