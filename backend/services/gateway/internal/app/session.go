package app

import (
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/problem"
)

// requireActiveSession fails closed if identity cannot confirm the user session. Service tokens do not represent a user session.
func requireActiveSession(client *http.Client, endpoint string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			principal, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok {
				return problem.Unauthenticated("")
			}
			if principal.Realm == authn.RealmService {
				return next(c)
			}
			req, err := http.NewRequestWithContext(c.Request().Context(), http.MethodGet, endpoint, nil)
			if err != nil {
				return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
			}
			req.Header.Set("Authorization", c.Request().Header.Get("Authorization"))
			resp, err := client.Do(req)
			if err != nil {
				return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
			}
			defer resp.Body.Close()
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
			switch resp.StatusCode {
			case http.StatusNoContent:
				return next(c)
			case http.StatusUnauthorized, http.StatusForbidden:
				return problem.Unauthenticated("")
			default:
				return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
			}
		}
	}
}
