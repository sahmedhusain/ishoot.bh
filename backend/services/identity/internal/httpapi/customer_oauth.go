package httpapi

import (
	"errors"
	"net/http"
	"slices"
	"time"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/oauth"
	"platform.local/backend/services/identity/internal/tokens"
)

func RegisterCustomerOAuth(e *echo.Echo, verifier *authn.Verifier, issuer *tokens.Issuer, svc *app.CustomerOAuth, callers []string, limit int64) {
	g := e.Group("/v1/identity/customer/oauth", authn.Require(verifier, authn.RealmService), func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store")
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok || !slices.Contains(callers, p.Subject) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	})
	g.GET("/providers", func(c echo.Context) error { return c.JSON(http.StatusOK, svc.Available(c.Request().Context())) })
	g.POST("/:provider", func(c echo.Context) error {
		var in struct {
			RedirectURI string `json:"redirectUri" validate:"required,max=2048"`
			Next        string `json:"next" validate:"required,max=2000"`
			Locale      string `json:"locale" validate:"required,oneof=en ar"`
			ClientIP    string `json:"clientIp" validate:"max=45"`
		}
		if err := httpx.BindJSON(c, &in, limit); err != nil {
			return err
		}
		out, err := svc.Begin(c.Request().Context(), c.Param("provider"), in.RedirectURI, in.Next, in.Locale, in.ClientIP)
		if err != nil {
			return oauthError(c, err)
		}
		return c.JSON(http.StatusCreated, out)
	})
	g.POST("/:provider/complete", func(c echo.Context) error {
		var in struct {
			State        string `json:"state" validate:"required,len=43"`
			BrowserState string `json:"browserState" validate:"required,len=43"`
			Code         string `json:"code" validate:"max=8192"`
			OTP          string `json:"otp" validate:"max=64"`
			Name         string `json:"name" validate:"max=120"`
			ClientIP     string `json:"clientIp" validate:"max=45"`
			UserAgent    string `json:"userAgent" validate:"max=512"`
		}
		if err := httpx.BindJSON(c, &in, limit); err != nil {
			return err
		}
		out, err := svc.Complete(c.Request().Context(), c.Param("provider"), in.State, in.BrowserState, in.Code, in.OTP, in.Name, in.ClientIP, in.UserAgent)
		if err != nil {
			return oauthError(c, err)
		}
		f := out.Result.Credential.Family
		token, err := issuer.Sign(f.SubjectID, f.ID, f.Realm, out.Result.Account.Roles, time.Now().UTC(), f.ExpiresAt)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, struct {
			Email      string        `json:"email"`
			Name       string        `json:"name"`
			Next       string        `json:"next"`
			Locale     string        `json:"locale"`
			Credential loginResponse `json:"credential"`
		}{Email: out.Email, Name: out.Name, Next: out.Next, Locale: out.Locale, Credential: loginResponse{
			refreshResponse: refreshResponse{SessionID: f.ID, SubjectID: f.SubjectID, Realm: f.Realm, ExpiresAt: f.ExpiresAt, RefreshToken: out.Result.Credential.Token}, AccessToken: token, Roles: out.Result.Account.Roles,
		}})
	})
}

func oauthError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, oauth.ErrRejected):
		return problem.Unauthenticated("")
	case errors.Is(err, app.ErrProviderEmailMissing):
		return problem.New(http.StatusUnprocessableEntity, "provider_email_missing", "")
	case errors.Is(err, app.ErrProviderConflict):
		return problem.New(http.StatusConflict, "provider_conflict", "")
	case errors.Is(err, app.ErrPolicyUnavailable):
		return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
	default:
		return codeError(c, err)
	}
}
