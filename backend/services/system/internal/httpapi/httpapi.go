// Package httpapi exposes the system use cases over HTTP, as described in api/openapi.yaml.
package httpapi

import (
	"errors"
	"net/http"
	"slices"
	"time"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/system/api"
	"platform.local/backend/services/system/internal/app"
)

// CodeUnknownModule is returned for a key that is not in the module catalogue.
const CodeUnknownModule = "module_not_found"

// Options configures the handlers.
type Options struct {
	Verifier *authn.Verifier
	// ReadCallers may read settings; ModuleWriters may also switch modules (the admin's setup wizard).
	ReadCallers, ModuleWriters []string
	JSONBodyLimit              int64
}

type handler struct {
	svc  *app.Service
	opts Options
}

// Register adds the routes.
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/system/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })

	services := e.Group("/v1/system", authn.Require(opts.Verifier, authn.RealmService))
	services.GET("/modules", h.modules, caller(opts.ReadCallers))
	services.PUT("/modules/:key", h.setModuleForService, caller(opts.ModuleWriters))

	desk := e.Group("/v1/system/desk", authn.Require(opts.Verifier, authn.RealmIT))
	desk.GET("/modules", h.modules, authz.Require(catalog.ITAccess, "modules", "read"))
	desk.PUT("/modules/:key", h.setModuleForIT, authz.Require(catalog.ITAccess, "modules", "edit"))
}

// caller lets through only the listed service callers.
func caller(allowed []string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok || !slices.Contains(allowed, p.Subject) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	}
}

type moduleJSON struct {
	Key              string     `json:"key"`
	NameEn           string     `json:"nameEn"`
	NameAr           string     `json:"nameAr"`
	EnabledByDefault bool       `json:"enabledByDefault"`
	Enabled          bool       `json:"enabled"`
	UpdatedBy        *string    `json:"updatedBy,omitempty"`
	UpdatedAt        *time.Time `json:"updatedAt,omitempty"`
}

func (h *handler) modules(c echo.Context) error {
	modules, err := h.svc.Modules(c.Request().Context())
	if err != nil {
		return err
	}
	items := make([]moduleJSON, len(modules))
	for i, m := range modules {
		items[i] = moduleJSON{Key: m.Key, NameEn: m.NameEn, NameAr: m.NameAr, EnabledByDefault: m.EnabledByDefault,
			Enabled: m.Enabled, UpdatedBy: m.UpdatedBy, UpdatedAt: m.UpdatedAt}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

type serviceModuleChange struct {
	Enabled *bool `json:"enabled" validate:"required"`
	// ActorID is the person the calling app acts for, recorded with the change.
	ActorID string `json:"actorId" validate:"required,max=64"`
}

func (h *handler) setModuleForService(c echo.Context) error {
	var in serviceModuleChange
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	return h.setModule(c, *in.Enabled, p.Subject+":"+in.ActorID)
}

type itModuleChange struct {
	Enabled *bool `json:"enabled" validate:"required"`
}

func (h *handler) setModuleForIT(c echo.Context) error {
	var in itModuleChange
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	return h.setModule(c, *in.Enabled, string(authn.RealmIT)+":"+p.Subject)
}

func (h *handler) setModule(c echo.Context, enabled bool, by string) error {
	err := h.svc.SetModule(c.Request().Context(), c.Param("key"), enabled, by)
	if errors.Is(err, app.ErrUnknownModule) {
		return problem.New(http.StatusNotFound, CodeUnknownModule, "")
	}
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
