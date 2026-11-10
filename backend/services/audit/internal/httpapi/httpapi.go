package httpapi
import (
	"encoding/base64"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/audit/api"
	"platform.local/backend/services/audit/internal/app"
)
const CodeNotFound = "event_not_found"
type Options struct {
	Verifier			*authn.Verifier
	DefaultPageSize, MaxPageSize	int32
}
type handler struct {
	svc	*app.Service
	opts	Options
}
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/audit/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })
	desk := e.Group("/v1/audit/desk", authn.Require(opts.Verifier, authn.RealmIT), authz.Require(catalog.ITAccess, "audit", "read"))
	desk.GET("/events", h.list)
	desk.GET("/events/:id", h.get)
	desk.GET("/subjects", h.subjects)
}
func (h *handler) list(c echo.Context) error {
	q := app.Query{
		Subject:	c.QueryParam("subject"), Service: c.QueryParam("service"), Actor: c.QueryParam("actor"), Limit: h.opts.DefaultPageSize,
	}
	var errs []problem.FieldError
	for name, max := range map[string]int{"subject": 200, "service": 64, "actor": 200} {
		if len(c.QueryParam(name)) > max {
			errs = append(errs, problem.FieldError{Field: name, Code: "max"})
		}
	}
	for name, target := range map[string]*time.Time{"from": &q.From, "to": &q.To} {
		if raw := c.QueryParam(name); raw != "" {
			t, err := time.Parse(time.RFC3339, raw)
			if err != nil {
				errs = append(errs, problem.FieldError{Field: name, Code: "datetime"})
			}
			*target = t
		}
	}
	if raw := c.QueryParam("limit"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || n < 1 || n > int64(h.opts.MaxPageSize) {
			errs = append(errs, problem.FieldError{Field: "limit", Code: "range"})
		}
		q.Limit = int32(n)
	}
	if raw := c.QueryParam("cursor"); raw != "" {
		when, id, ok := decodeCursor(raw)
		if !ok {
			errs = append(errs, problem.FieldError{Field: "cursor", Code: "invalid"})
		}
		q.BeforeOccurred, q.BeforeID = when, id
	}
	if len(errs) > 0 {
		return problem.Validation(errs...)
	}
	items, err := h.svc.List(c.Request().Context(), q)
	if err != nil {
		return err
	}
	out := map[string]any{"items": items}
	if len(items) == int(q.Limit) {
		last := items[len(items)-1]
		out["nextCursor"] = base64.RawURLEncoding.EncodeToString([]byte(last.OccurredAt.Format(time.RFC3339Nano) + "|" + last.ID))
	}
	return c.JSON(http.StatusOK, out)
}
func decodeCursor(raw string) (time.Time, string, bool) {
	b, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return time.Time{}, "", false
	}
	when, id, found := strings.Cut(string(b), "|")
	t, err := time.Parse(time.RFC3339Nano, when)
	if !found || err != nil {
		return time.Time{}, "", false
	}
	if _, err := uuid.Parse(id); err != nil {
		return time.Time{}, "", false
	}
	return t, id, true
}
func (h *handler) get(c echo.Context) error {
	ev, err := h.svc.Get(c.Request().Context(), c.Param("id"))
	if errors.Is(err, app.ErrNotFound) {
		return problem.New(http.StatusNotFound, CodeNotFound, "")
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, ev)
}
func (h *handler) subjects(c echo.Context) error {
	items, err := h.svc.Subjects(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}
