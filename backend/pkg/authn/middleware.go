package authn
import (
	"log/slog"
	"strings"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
)
func BearerToken(header string) string {
	scheme, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") {
		return ""
	}
	return strings.TrimSpace(token)
}
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
