// Package httpapi maps the identity session contract to use cases.
package httpapi

import (
	"errors"
	"math"
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/guard"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/internal/tokens"
)

type Handler struct {
	sessions *sessions.Service
	issuer   *tokens.Issuer
	limit    int64
	login    *accounts.Service
	callers  map[authn.Realm][]string
}

// Register exposes public JWKS and service-authenticated session endpoints. Never allow user tokens on service routes.
func Register(e *echo.Echo, verifier *authn.Verifier, svc *sessions.Service, issuer *tokens.Issuer, login *accounts.Service, limit int64, callers map[authn.Realm][]string) {
	h := &Handler{sessions: svc, issuer: issuer, login: login, limit: limit, callers: callers}
	e.GET("/.well-known/jwks.json", h.jwks)
	g := e.Group("/v1/identity/:realm/sessions", func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error { c.Response().Header().Set("Cache-Control", "no-store"); return next(c) }
	}, authn.Require(verifier, authn.RealmService))
	if login != nil {
		g.POST("/login", h.loginPassword)
		e.GET("/v1/identity/session", h.validateSession, func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error { c.Response().Header().Set("Cache-Control", "no-store"); return next(c) }
		}, authn.Require(issuer.Verifier(), authn.UserRealms...))
	}
	g.POST("/refresh", h.refresh)
	g.POST("/logout", h.logout)
}

func (h *Handler) jwks(c echo.Context) error {
	return c.Blob(http.StatusOK, echo.MIMEApplicationJSON, h.issuer.JWKS())
}

type refreshRequest struct {
	Token string `json:"refreshToken" validate:"required,len=43"`
}
type refreshResponse struct {
	SessionID    string      `json:"sessionId"`
	SubjectID    string      `json:"subjectId"`
	Realm        authn.Realm `json:"realm"`
	ExpiresAt    time.Time   `json:"expiresAt"`
	RefreshToken string      `json:"refreshToken"`
}

func (h *Handler) realm(c echo.Context) (authn.Realm, error) {
	r, err := authn.ParseRealm(c.Param("realm"))
	if err != nil || r == authn.RealmService {
		return "", problem.BadRequest("invalid realm")
	}
	principal, ok := authn.PrincipalFrom(c.Request().Context())
	if !ok || principal.Realm != authn.RealmService || !slices.Contains(h.callers[r], principal.Subject) {
		return "", problem.Unauthenticated("")
	}
	return r, nil
}
func (h *Handler) read(c echo.Context) (authn.Realm, string, error) {
	c.Response().Header().Set("Cache-Control", "no-store")
	r, err := h.realm(c)
	if err != nil {
		return "", "", err
	}
	var in refreshRequest
	if err := httpx.BindJSON(c, &in, h.limit); err != nil {
		return "", "", err
	}
	return r, in.Token, nil
}
func sessionError(err error) error {
	if errors.Is(err, sessions.ErrInvalid) || errors.Is(err, sessions.ErrReuse) {
		return problem.Unauthenticated("")
	}
	return err
}
func (h *Handler) refresh(c echo.Context) error {
	r, token, err := h.read(c)
	if err != nil {
		return err
	}
	if h.login != nil {
		now := time.Now().UTC()
		result, err := h.login.Refresh(c.Request().Context(), r, token, now)
		if err != nil {
			return sessionError(err)
		}
		access, err := h.issuer.Sign(result.Account.SubjectID, result.Credential.Family.ID, r, result.Account.Roles, now, result.Credential.Family.ExpiresAt)
		if err != nil {
			return err
		}
		roles := result.Account.Roles
		if roles == nil {
			roles = []string{}
		}
		return c.JSON(http.StatusOK, loginResponse{refreshResponse: refreshResponse{SessionID: result.Credential.Family.ID, SubjectID: result.Account.SubjectID, Realm: r, ExpiresAt: result.Credential.Family.ExpiresAt, RefreshToken: result.Credential.Token}, AccessToken: access, Roles: roles})
	}
	cred, err := h.sessions.Refresh(c.Request().Context(), r, token, time.Now())
	if err != nil {
		return sessionError(err)
	}
	return c.JSON(http.StatusOK, refreshResponse{SessionID: cred.Family.ID, SubjectID: cred.Family.SubjectID, Realm: cred.Family.Realm, ExpiresAt: cred.Family.ExpiresAt, RefreshToken: cred.Token})
}
func (h *Handler) logout(c echo.Context) error {
	r, token, err := h.read(c)
	if err != nil {
		return err
	}
	if err := h.sessions.Logout(c.Request().Context(), r, token, time.Now()); err != nil {
		return sessionError(err)
	}
	return c.NoContent(http.StatusNoContent)
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,max=254"`
	Password string `json:"password" validate:"required,max=1024"`
	OTP      string `json:"otp" validate:"max=64"`
	ClientIP string `json:"clientIp" validate:"max=45"`
}
type loginResponse struct {
	refreshResponse
	AccessToken string   `json:"accessToken"`
	Roles       []string `json:"roles"`
}

func (h *Handler) loginPassword(c echo.Context) error {
	r, err := h.realm(c)
	if err != nil {
		return err
	}
	var in loginRequest
	if err := httpx.BindJSON(c, &in, h.limit); err != nil {
		return err
	}
	now := time.Now().UTC()
	result, err := h.login.Login(c.Request().Context(), accounts.Input{Realm: r, Email: in.Email, Password: in.Password, OTP: in.OTP, ClientIP: in.ClientIP}, now)
	if err != nil {
		var limited *guard.Limited
		switch {
		case errors.As(err, &limited):
			seconds := max(1, int(math.Ceil(limited.RetryAfter.Seconds())))
			c.Response().Header().Set("Retry-After", strconv.Itoa(seconds))
			return problem.New(http.StatusTooManyRequests, problem.CodeRateLimited, "")
		case errors.Is(err, guard.ErrUnavailable):
			return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
		case errors.Is(err, accounts.ErrMFARequired):
			return problem.New(http.StatusUnauthorized, "mfa_required", "")
		case errors.Is(err, accounts.ErrInvalid):
			return problem.Unauthenticated("")
		default:
			return err
		}
	}
	access, err := h.issuer.Sign(result.Account.SubjectID, result.Credential.Family.ID, r, result.Account.Roles, now, result.Credential.Family.ExpiresAt)
	if err != nil {
		return err
	}
	roles := result.Account.Roles
	if roles == nil {
		roles = []string{}
	}
	return c.JSON(http.StatusOK, loginResponse{refreshResponse: refreshResponse{SessionID: result.Credential.Family.ID, SubjectID: result.Account.SubjectID, Realm: r, ExpiresAt: result.Credential.Family.ExpiresAt, RefreshToken: result.Credential.Token}, AccessToken: access, Roles: roles})
}

func (h *Handler) validateSession(c echo.Context) error {
	principal, ok := authn.PrincipalFrom(c.Request().Context())
	if !ok {
		return problem.Unauthenticated("")
	}
	if err := h.login.ValidateSession(c.Request().Context(), principal, time.Now()); err != nil {
		if errors.Is(err, accounts.ErrInvalid) {
			return problem.Unauthenticated("")
		}
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
