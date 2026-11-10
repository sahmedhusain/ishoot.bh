package httpapi
import (
	"errors"
	"math"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/guard"
	"platform.local/backend/services/identity/internal/tokens"
)
func RegisterCustomerCodes(e *echo.Echo, verifier *authn.Verifier, issuer *tokens.Issuer, svc *app.CustomerCodes, callers []string, limit int64) {
	g := e.Group("/v1/identity/customer", authn.Require(verifier, authn.RealmService), func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store")
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok || !slices.Contains(callers, p.Subject) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	})
	g.POST("/sign-in-codes", func(c echo.Context) error {
		var in struct {
			Email		string	`json:"email" validate:"required,max=254"`
			ClientIP	string	`json:"clientIp" validate:"max=45"`
		}
		if err := httpx.BindJSON(c, &in, limit); err != nil {
			return err
		}
		out, err := svc.Issue(c.Request().Context(), in.Email, in.ClientIP)
		if err != nil {
			return codeError(c, err)
		}
		return c.JSON(http.StatusCreated, out)
	})
	g.POST("/sessions/code", func(c echo.Context) error {
		var in struct {
			Email		string	`json:"email" validate:"required,max=254"`
			Code		string	`json:"code" validate:"required,len=6,numeric"`
			OTP		string	`json:"otp" validate:"max=64"`
			ClientIP	string	`json:"clientIp" validate:"max=45"`
			UserAgent	string	`json:"userAgent" validate:"max=512"`
		}
		if err := httpx.BindJSON(c, &in, limit); err != nil {
			return err
		}
		result, err := svc.SignIn(c.Request().Context(), in.Email, in.Code, in.OTP, in.ClientIP, in.UserAgent)
		if err != nil {
			return codeError(c, err)
		}
		f := result.Credential.Family
		token, err := issuer.Sign(f.SubjectID, f.ID, f.Realm, result.Account.Roles, time.Now().UTC(), f.ExpiresAt)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, struct {
			Email		string		`json:"email"`
			Credential	loginResponse	`json:"credential"`
		}{Email: strings.ToLower(strings.TrimSpace(in.Email)), Credential: loginResponse{
			refreshResponse:	refreshResponse{SessionID: f.ID, SubjectID: f.SubjectID, Realm: f.Realm, ExpiresAt: f.ExpiresAt, RefreshToken: result.Credential.Token},
			AccessToken:		token, Roles: result.Account.Roles,
		}})
	})
}
func codeError(c echo.Context, err error) error {
	var limited *guard.Limited
	switch {
	case errors.As(err, &limited):
		c.Response().Header().Set("Retry-After", strconv.Itoa(max(1, int(math.Ceil(limited.RetryAfter.Seconds())))))
		return problem.New(http.StatusTooManyRequests, problem.CodeRateLimited, "")
	case errors.Is(err, guard.ErrUnavailable):
		return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
	case errors.Is(err, accounts.ErrMFARequired):
		return problem.New(http.StatusUnauthorized, "mfa_required", "")
	case errors.Is(err, accounts.ErrInvalid), errors.Is(err, guard.ErrDenied):
		return problem.Unauthenticated("")
	default:
		return managedError(c, err)
	}
}
