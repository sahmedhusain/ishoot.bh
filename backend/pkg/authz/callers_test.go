package authz_test
import (
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
)
func TestServiceCallers(t *testing.T) {
	readers, writers := []string{"web", "it"}, []string{"admin"}
	cases := []struct {
		name	string
		realm	authn.Realm
		subject	string
		method	string
		want	int
	}{
		{"reader reads", authn.RealmService, "web", http.MethodGet, http.StatusOK},
		{"reader cannot write", authn.RealmService, "web", http.MethodPost, http.StatusForbidden},
		{"reader cannot delete", authn.RealmService, "it", http.MethodDelete, http.StatusForbidden},
		{"writer writes", authn.RealmService, "admin", http.MethodPut, http.StatusOK},
		{"writer reads", authn.RealmService, "admin", http.MethodGet, http.StatusOK},
		{"unlisted service cannot read", authn.RealmService, "finance", http.MethodGet, http.StatusForbidden},
		{"unlisted service cannot write", authn.RealmService, "finance", http.MethodPost, http.StatusForbidden},
		{"other realms are left to the service", authn.RealmStaff, "someone", http.MethodGet, http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			e := echo.New()
			e.HTTPErrorHandler = httpx.ErrorHandler(logx.New(nil, logx.Options{}))
			e.Any("/x", func(c echo.Context) error { return c.NoContent(http.StatusOK) }, authz.ServiceCallers(readers, writers))
			req := httptest.NewRequest(tc.method, "/x", nil)
			req = req.WithContext(authn.WithPrincipal(req.Context(), authn.Principal{Subject: tc.subject, Realm: tc.realm}))
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, req)
			require.Equal(t, tc.want, rec.Code)
		})
	}
}
func TestServiceCallersRequiresPrincipal(t *testing.T) {
	e := echo.New()
	e.HTTPErrorHandler = httpx.ErrorHandler(logx.New(nil, logx.Options{}))
	e.GET("/x", func(c echo.Context) error { return c.NoContent(http.StatusOK) }, authz.ServiceCallers([]string{"web"}, []string{"admin"}))
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	require.Equal(t, http.StatusUnauthorized, rec.Code)
}
