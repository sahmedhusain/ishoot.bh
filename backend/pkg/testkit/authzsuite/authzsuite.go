// Package authzsuite checks, for any service that guards its routes with authn.Require and authz.ServiceCallers,
// that the guard holds on every route the service registers. It needs no database: a request refused by the guard
// never reaches a handler, so the service can be wired with a nil use-case layer.
package authzsuite

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
)

// Register wires the service's routes onto e with verifier v and the given service caller lists.
type Register func(e *echo.Echo, v *authn.Verifier, readers, writers []string)

// Run registers the service and asserts, for every route under prefix (for example "/v1/finance/"):
//   - without a token, a guarded route answers 401;
//   - a token of a signed-in person (staff, IT or customer) answers 401: these services take service tokens only;
//   - a service caller in neither list answers 403;
//   - a reader-only service caller answers 403 on every method that changes data.
//
// Routes that answer something other than 401 without a token are treated as public and skipped, but at least
// one guarded route must exist. Routes that are public by design are listed as "METHOD /path" in public and are
// never called (their handlers need a real use-case layer). The service's openapi.yaml route is ignored.
func Run(t *testing.T, prefix string, register Register, public ...string) {
	t.Helper()
	const reader, writer, intruder = "reader-svc", "writer-svc", "intruder-svc"
	signers := map[string]*authntest.Signer{}
	set := jwk.NewSet()
	for _, caller := range []string{reader, writer, intruder} {
		s := authntest.NewServiceSigner(t, caller)
		signers[caller] = s
		for i := 0; i < s.Public.Len(); i++ {
			key, ok := s.Public.Key(i)
			require.True(t, ok)
			require.NoError(t, set.AddKey(key))
		}
	}
	trust := authn.Trust{Issuer: authn.ServiceIssuerPrefix, Keys: authn.StaticKeys{Set: set}, Realms: []authn.Realm{authn.RealmService}}
	// A signed-in person's token: accepted by identity's realms, but business services take service tokens only.
	people := authntest.NewSigner(t, "identity:1")
	e := echo.New()
	e.HTTPErrorHandler = httpx.ErrorHandler(logx.New(io.Discard, logx.Options{}))
	register(e, authn.NewVerifier(time.Second, trust, people.Trust()), []string{reader}, []string{writer})

	call := func(method, path, caller string) (code int) {
		// A request the guard lets through reaches a handler wired to a nil use-case layer and panics; that marks
		// the route as open (-1), which only public routes should be.
		defer func() {
			if recover() != nil {
				code = -1
			}
		}()
		req := httptest.NewRequestWithContext(context.Background(), method, path, strings.NewReader("{}"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		switch {
		case caller == "staff" || caller == "it" || caller == "customer":
			realm := map[string]authn.Realm{"staff": authn.RealmStaff, "it": authn.RealmIT, "customer": authn.RealmCustomer}[caller]
			req.Header.Set(echo.HeaderAuthorization, "Bearer "+people.Sign(t, authntest.Token{Subject: "person-1", Realm: realm}))
		case caller != "":
			req.Header.Set(echo.HeaderAuthorization, "Bearer "+signers[caller].Sign(t, authntest.Token{Subject: caller}))
		}
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		return rec.Code
	}

	guarded := 0
	for _, r := range e.Routes() {
		if !strings.HasPrefix(r.Path, prefix) || strings.HasSuffix(r.Path, "openapi.yaml") || r.Method == "echo_route_not_found" {
			continue
		}
		if slices.Contains(public, r.Method+" "+r.Path) {
			continue
		}
		path := strings.NewReplacer(":id", "00000000-0000-0000-0000-000000000000", ":code", "X", ":priority", "normal").Replace(r.Path)
		if call(r.Method, path, "") != http.StatusUnauthorized {
			continue
		}
		guarded++
		name := r.Method + " " + r.Path
		for _, person := range []string{"staff", "it", "customer"} {
			require.Equal(t, http.StatusUnauthorized, call(r.Method, path, person), "%s must refuse a %s token", name, person)
		}
		require.Equal(t, http.StatusForbidden, call(r.Method, path, intruder), "%s must refuse a service caller that is not listed", name)
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			require.Equal(t, http.StatusForbidden, call(r.Method, path, reader), "%s must refuse a reader-only caller", name)
		}
	}
	require.Positive(t, guarded, "no guarded routes found under %s", prefix)
}
