package authn

import (
	"log/slog"
	"strings"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
)

// BearerToken returns the token from an "Authorization: Bearer …" header.
func BearerToken(header string) string {
	scheme, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") {
		return ""
	}
	return strings.TrimSpace(token)
}

// Require is Echo middleware that admits only requests carrying a valid access token of one of realms.
func Require(v *Verifier, realms ...Realm) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			principal, err := v.Verify(req.Context(), BearerToken(req.Header.Get(echo.HeaderAuthorization)), realms...)
			if err != nil {
				return problem.Unauthenticated("")
			}
			ctx := WithPrincipal(req.Context(), principal)
			ctx = logx.WithAttrs(ctx, slog.String("user_id", principal.Subject), slog.String("realm", string(principal.Realm)))
			c.SetRequest(req.WithContext(ctx))
			return next(c)
		}
	}
}
