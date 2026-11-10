package httpx
import (
	"errors"
	"log/slog"
	"net/http"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/problem"
)
func ErrorHandler(logger *logx.Logger) echo.HTTPErrorHandler {
	return func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		p := toProblem(err)
		p.RequestID = c.Response().Header().Get(HeaderRequestID)
		if p.Instance == "" {
			p.Instance = c.Request().URL.Path
		}
		if p.Status >= http.StatusInternalServerError {
			logger.ErrorContext(c.Request().Context(), "request failed", slog.Any("error", err), slog.Int("status", p.Status))
		}
		if p.Status == http.StatusTooManyRequests {
			if retry := c.Response().Header().Get("Retry-After"); retry == "" {
				c.Response().Header().Set("Retry-After", "1")
			}
		}
		if c.Request().Method == http.MethodHead {
			_ = c.NoContent(p.Status)
			return
		}
		c.Response().Header().Set(echo.HeaderContentType, problem.ContentType)
		c.Response().WriteHeader(p.Status)
		_ = encodeJSON(c.Response(), p)
	}
}
func toProblem(err error) *problem.Problem {
	var p *problem.Problem
	if errors.As(err, &p) {
		copied := *p
		return &copied
	}
	var he *echo.HTTPError
	if errors.As(err, &he) {
		switch he.Code {
		case http.StatusNotFound:
			return problem.New(he.Code, problem.CodeNotFound, "")
		case http.StatusMethodNotAllowed:
			return problem.New(he.Code, problem.CodeBadRequest, "method not allowed")
		case http.StatusRequestEntityTooLarge:
			return problem.New(he.Code, problem.CodeTooLarge, "")
		case http.StatusUnauthorized:
			return problem.New(he.Code, problem.CodeUnauthenticated, "")
		case http.StatusForbidden:
			return problem.New(he.Code, problem.CodeForbidden, "")
		case http.StatusTooManyRequests:
			return problem.New(he.Code, problem.CodeRateLimited, "")
		case http.StatusServiceUnavailable:
			return problem.New(he.Code, problem.CodeTimeout, "")
		}
		if he.Code >= 400 && he.Code < 500 {
			return problem.New(he.Code, problem.CodeBadRequest, "")
		}
	}
	return problem.Internal()
}
