package authzsuite_test

import (
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/testkit/authzsuite"
)

func TestAuthzSuite(t *testing.T) {
	register := func(e *echo.Echo, v *authn.Verifier, readers, writers []string) {
		g := e.Group("/v1/test/", authn.Require(v, authn.RealmService), authz.ServiceCallers(readers, writers))
		g.GET("items", func(c echo.Context) error {
			return c.String(http.StatusOK, "ok")
		})
		g.POST("items", func(c echo.Context) error {
			return c.String(http.StatusOK, "created")
		})
	}

	authzsuite.Run(t, "/v1/test/", register)
}
