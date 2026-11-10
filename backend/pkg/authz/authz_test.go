package authz
import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
)
func TestAllowedUsesRoleTemplates(t *testing.T) {
	support := authn.Principal{Realm: authn.RealmIT, Roles: []string{"it_support"}}
	assert.True(t, Allowed(catalog.ITAccess, support, "tickets", "assign"))
	assert.False(t, Allowed(catalog.ITAccess, support, "integrations", "edit"))
	assert.False(t, Allowed(catalog.ITAccess, authn.Principal{}, "tickets", "read"))
}
func TestRequire(t *testing.T) {
	e := echo.New()
	e.HTTPErrorHandler = httpx.ErrorHandler(logx.New(nil, logx.Options{}))
	ok := func(c echo.Context) error { return c.NoContent(http.StatusNoContent) }
	e.GET("/x", ok, func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if roles := c.Request().Header.Get("X-Roles"); roles != "" {
				ctx := authn.WithPrincipal(c.Request().Context(), authn.Principal{Realm: authn.RealmIT, Roles: []string{roles}})
				c.SetRequest(c.Request().WithContext(ctx))
			}
			return next(c)
		}
	}, Require(catalog.ITAccess, "tickets", "assign"))
	for roles, want := range map[string]int{"": 401, "it_auditor": 403, "it_support": 204} {
		req := httptest.NewRequest(http.MethodGet, "/x", nil).WithContext(context.Background())
		req.Header.Set("X-Roles", roles)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, want, rec.Code, roles)
	}
}
