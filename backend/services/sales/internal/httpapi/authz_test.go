package httpapi_test
import (
	"testing"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/testkit/authzsuite"
	"platform.local/backend/services/sales/internal/httpapi"
)
func TestRoutesAreGuarded(t *testing.T) {
	authzsuite.Run(t, "/v1/sales/", func(e *echo.Echo, v *authn.Verifier, readers, writers []string) {
		httpapi.Register(e, nil, httpapi.Options{Verifier: v, Readers: readers, Writers: writers})
	}, "POST /v1/sales/inquiries")
}
