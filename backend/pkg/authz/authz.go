package authz
import (
	"net/http"
	"slices"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/problem"
)
func Allowed(access catalog.Access, p authn.Principal, resource, action string) bool {
	for _, role := range p.Roles {
		if access.DefaultAllows(access.CanonicalRole(role), resource, action) {
			return true
		}
	}
	return false
}
func Require(access catalog.Access, resource, action string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok {
				return problem.Unauthenticated("")
			}
			if !Allowed(access, p, resource, action) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	}
}
func ServiceCallers(readers, writers []string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok {
				return problem.Unauthenticated("")
			}
			if p.Realm != authn.RealmService {
				return next(c)
			}
			allowed := writers
			switch c.Request().Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
				allowed = append(append([]string(nil), readers...), writers...)
			}
			if !slices.Contains(allowed, p.Subject) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	}
}
