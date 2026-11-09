// Package authz checks a signed-in user's permissions against a realm's catalogue (contracts/catalog). Grants come
// from the role templates; per-installation overrides are added when the owning service stores them.
package authz

import (
	"net/http"
	"slices"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/problem"
)

// Allowed reports whether any of the principal's roles grants action on resource.
func Allowed(access catalog.Access, p authn.Principal, resource, action string) bool {
	for _, role := range p.Roles {
		if access.DefaultAllows(access.CanonicalRole(role), resource, action) {
			return true
		}
	}
	return false
}

// Require is Echo middleware admitting only principals allowed to perform action on resource. It must run after
// authn.Require.
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

// ServiceCallers is Echo middleware for business services that are reached by other services. A request made with a
// service token is admitted only when its subject is one of readers (GET, HEAD, OPTIONS) or writers (every other
// method); a writer may also read. Tokens of other realms pass through untouched: their access is decided by the
// service's own checks. It must run after authn.Require.
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
