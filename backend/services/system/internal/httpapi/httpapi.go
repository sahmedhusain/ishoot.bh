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

// Error codes returned as Problem detail.
const (
	CodeUnknownModule      = "module_not_found"
	CodeUnknownIntegration = "integration_not_found"
	CodeValidationFailed   = "validation_failed"
	CodeDomainsMustDiffer  = "domains_must_differ"
)

// Options configures the handlers.
type Options struct {
	CompanyReaders, SequenceCallers, CurrencyCallers []string
	CompanyBodyLimit                                 int64

	Verifier *authn.Verifier
	// ReadCallers may read settings; ModuleWriters may switch modules; IntegrationWriters may modify integrations;
	// DomainWriters may set the domains for a person they name (the admin's setup wizard).
	ReadCallers, ModuleWriters, IntegrationWriters, DomainWriters []string
	ModuleReadCallers                                             []string
	JSONBodyLimit                                                 int64
	// SiteCodeBodyLimit caps the site code request, which carries up to two 50,000-character documents.
	SiteCodeBodyLimit int64
	FilesURL          string
}

type handler struct {
	svc  *app.Service
	opts Options
}

// Register adds the routes.
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	h.companyRoutes(e)
	h.operationsRoutes(e)
	e.GET("/v1/system/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })

	services := e.Group("/v1/system", authn.Require(opts.Verifier, authn.RealmService))
	services.GET("/modules", h.modules, caller(slices.Concat(opts.ReadCallers, opts.ModuleReadCallers)))
	services.PUT("/modules/:key", h.setModuleForService, caller(opts.ModuleWriters))

	services.GET("/sign-in/:provider", func(c echo.Context) error {
		provider := c.Param("provider")
		if provider != "google" && provider != "apple" {
			return problem.NotFound("")
		}
		item, err := h.svc.ServiceIntegration(c.Request().Context(), provider+"_signin")
		if err != nil {
			return err
		}
		site, err := h.svc.Site(c.Request().Context())
		if err != nil {
			return err
		}
		values := map[string]string{}
		if item.IsActive {
			values = item.Credentials
		}
		return c.JSON(http.StatusOK, struct {
			Active        bool              `json:"active"`
			Values        map[string]string `json:"values"`
			WebsiteDomain string            `json:"websiteDomain"`
		}{Active: item.IsActive, Values: values, WebsiteDomain: site.WebsiteDomain})
	}, caller([]string{"identity"}))

	services.GET("/integrations", h.listIntegrations, caller(opts.ReadCallers))
	services.GET("/integrations/:provider", h.getIntegration, caller(opts.ReadCallers))
	services.PUT("/integrations/:provider", h.setIntegrationForService, caller(opts.IntegrationWriters))
	services.DELETE("/integrations/:provider", h.unlinkIntegrationForService, caller(opts.IntegrationWriters))
	services.PUT("/integrations/:provider/status", h.updateIntegrationStatus, caller(opts.IntegrationWriters))

	services.GET("/site", h.site, caller(opts.ReadCallers))
	services.PUT("/site/domains", h.setDomainsForService, caller(opts.DomainWriters))

	desk := e.Group("/v1/system/desk", authn.Require(opts.Verifier, authn.RealmIT))
	desk.GET("/modules", h.modules, authz.Require(catalog.ITAccess, "modules", "read"))
	desk.PUT("/modules/:key", h.setModuleForIT, authz.Require(catalog.ITAccess, "modules", "edit"))

	desk.GET("/integrations", h.listIntegrationsForIT, authz.Require(catalog.ITAccess, "integrations", "read"))
	desk.PUT("/integrations/:provider", h.setIntegrationForIT, authz.Require(catalog.ITAccess, "integrations", "edit"))
	desk.DELETE("/integrations/:provider", h.unlinkIntegrationForIT, authz.Require(catalog.ITAccess, "integrations", "delete"))

	desk.GET("/site/domains", h.siteDomains, authz.Require(catalog.ITAccess, "domains", "read"))
	desk.PUT("/site/domains", h.setDomainsForIT, authz.Require(catalog.ITAccess, "domains", "edit"))
	desk.GET("/site/code", h.siteCode, authz.Require(catalog.ITAccess, "site_code", "read"))
	desk.PUT("/site/code", h.setSiteCodeForIT, authz.Require(catalog.ITAccess, "site_code", "edit"))
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

func (h *handler) listIntegrations(c echo.Context) error {
	items, err := h.svc.ServiceIntegrations(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *handler) getIntegration(c echo.Context) error {
	item, err := h.svc.ServiceIntegration(c.Request().Context(), c.Param("provider"))
	if errors.Is(err, app.ErrUnknownIntegration) {
		return problem.New(http.StatusNotFound, CodeUnknownIntegration, "")
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, item)
}

type serviceIntegrationChange struct {
	IsActive *bool             `json:"isActive" validate:"required"`
	Values   map[string]string `json:"values"`
	Config   map[string]any    `json:"config"`
	ActorID  string            `json:"actorId" validate:"required,max=64"`
}

func (h *handler) setIntegrationForService(c echo.Context) error {
	var in serviceIntegrationChange
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	item, err := h.svc.SetIntegration(c.Request().Context(), c.Param("provider"), app.SaveIntegrationInput{
		IsActive: *in.IsActive,
		Values:   in.Values,
		Config:   in.Config,
	}, p.Subject+":"+in.ActorID)
	if errors.Is(err, app.ErrValidationFailed) {
		return problem.New(http.StatusUnprocessableEntity, CodeValidationFailed, err.Error())
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, item)
}

func (h *handler) unlinkIntegrationForService(c echo.Context) error {
	p, _ := authn.PrincipalFrom(c.Request().Context())
	err := h.svc.UnlinkIntegration(c.Request().Context(), c.Param("provider"), p.Subject)
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

type updateStatusBody struct {
	HealthStatus         *string           `json:"healthStatus"`
	LastError            *string           `json:"lastError"`
	AccountName          *string           `json:"accountName"`
	LastCheckedAt        *time.Time        `json:"lastCheckedAt"`
	LastSyncedAt         *time.Time        `json:"lastSyncedAt"`
	Config               map[string]any    `json:"config"`
	RefreshedCredentials map[string]string `json:"refreshedCredentials"`
	SyncLeaseToken       *string           `json:"syncLeaseToken"`
	SyncLeaseUntil       *time.Time        `json:"syncLeaseUntil"`
}

func (h *handler) updateIntegrationStatus(c echo.Context) error {
	var in updateStatusBody
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	err := h.svc.UpdateIntegrationStatus(c.Request().Context(), c.Param("provider"), app.UpdateIntegrationStatusInput{
		HealthStatus:         in.HealthStatus,
		LastError:            in.LastError,
		AccountName:          in.AccountName,
		LastCheckedAt:        in.LastCheckedAt,
		LastSyncedAt:         in.LastSyncedAt,
		Config:               in.Config,
		RefreshedCredentials: in.RefreshedCredentials,
		SyncLeaseToken:       in.SyncLeaseToken,
		SyncLeaseUntil:       in.SyncLeaseUntil,
	})
	if errors.Is(err, app.ErrUnknownIntegration) {
		return problem.New(http.StatusNotFound, CodeUnknownIntegration, "")
	}
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listIntegrationsForIT(c echo.Context) error {
	items, err := h.svc.DeskIntegrations(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

type itIntegrationChange struct {
	IsActive *bool             `json:"isActive" validate:"required"`
	Values   map[string]string `json:"values"`
	Config   map[string]any    `json:"config"`
}

func (h *handler) setIntegrationForIT(c echo.Context) error {
	var in itIntegrationChange
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	item, err := h.svc.SetIntegration(c.Request().Context(), c.Param("provider"), app.SaveIntegrationInput{
		IsActive: *in.IsActive,
		Values:   in.Values,
		Config:   in.Config,
	}, string(authn.RealmIT)+":"+p.Subject)
	if errors.Is(err, app.ErrValidationFailed) {
		return problem.New(http.StatusUnprocessableEntity, CodeValidationFailed, err.Error())
	}
	if err != nil {
		return err
	}

	// Format as DeskIntegration so no raw secrets leak
	deskItem := app.DeskIntegration{
		Provider:      item.Provider,
		IsActive:      item.IsActive,
		HealthStatus:  item.HealthStatus,
		AccountName:   item.AccountName,
		LastError:     item.LastError,
		LastCheckedAt: item.LastCheckedAt,
		LastSyncedAt:  item.LastSyncedAt,
		Config:        item.Config,
		UpdatedBy:     item.UpdatedBy,
		UpdatedAt:     item.UpdatedAt,
		Values:        make(map[string]string),
		Secrets:       make(map[string]app.SecretHint),
	}
	if prov, ok := catalog.Integrations.Provider(item.Provider); ok {
		for _, f := range prov.Fields {
			val := item.Credentials[f.Key]
			if f.Secret {
				deskItem.Secrets[f.Key] = app.SecretHint{Set: val != "", Hint: app.SecretHintFor(val)}
			} else {
				deskItem.Values[f.Key] = val
			}
		}
	}
	return c.JSON(http.StatusOK, deskItem)
}

func (h *handler) unlinkIntegrationForIT(c echo.Context) error {
	p, _ := authn.PrincipalFrom(c.Request().Context())
	err := h.svc.UnlinkIntegration(c.Request().Context(), c.Param("provider"), string(authn.RealmIT)+":"+p.Subject)
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) site(c echo.Context) error {
	site, err := h.svc.Site(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, site)
}

type siteDomainsJSON struct {
	WebsiteDomain string     `json:"websiteDomain"`
	AdminDomain   string     `json:"adminDomain"`
	UpdatedBy     *string    `json:"updatedBy,omitempty"`
	UpdatedAt     *time.Time `json:"updatedAt,omitempty"`
}

func domainsOf(site app.Site) siteDomainsJSON {
	return siteDomainsJSON{WebsiteDomain: site.WebsiteDomain, AdminDomain: site.AdminDomain, UpdatedBy: site.UpdatedBy, UpdatedAt: site.UpdatedAt}
}

type siteCodeJSON struct {
	app.SiteCode
	UpdatedBy *string    `json:"updatedBy,omitempty"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
}

func (h *handler) siteDomains(c echo.Context) error {
	site, err := h.svc.Site(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, domainsOf(site))
}

func (h *handler) siteCode(c echo.Context) error {
	site, err := h.svc.Site(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, siteCodeJSON{SiteCode: site.Code, UpdatedBy: site.UpdatedBy, UpdatedAt: site.UpdatedAt})
}

type domainsChange struct {
	WebsiteDomain string `json:"websiteDomain" validate:"max=300"`
	AdminDomain   string `json:"adminDomain" validate:"max=300"`
}

type serviceDomainsChange struct {
	domainsChange
	ActorID string `json:"actorId" validate:"required,max=64"`
}

func (h *handler) setDomainsForService(c echo.Context) error {
	var in serviceDomainsChange
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	return h.setDomains(c, in.domainsChange, p.Subject+":"+in.ActorID)
}

func (h *handler) setDomainsForIT(c echo.Context) error {
	var in domainsChange
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	return h.setDomains(c, in, string(authn.RealmIT)+":"+p.Subject)
}

func (h *handler) setDomains(c echo.Context, in domainsChange, by string) error {
	site, err := h.svc.SetSiteDomains(c.Request().Context(), in.WebsiteDomain, in.AdminDomain, by)
	switch {
	case errors.Is(err, app.ErrDomainsMustDiffer):
		return problem.New(http.StatusUnprocessableEntity, CodeDomainsMustDiffer, "")
	case errors.Is(err, app.ErrValidationFailed):
		return problem.New(http.StatusUnprocessableEntity, CodeValidationFailed, err.Error())
	case err != nil:
		return err
	}
	return c.JSON(http.StatusOK, domainsOf(site))
}

func (h *handler) setSiteCodeForIT(c echo.Context) error {
	var in app.SiteCode
	if err := httpx.BindJSON(c, &in, h.opts.SiteCodeBodyLimit); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	site, err := h.svc.SetSiteCode(c.Request().Context(), in, string(authn.RealmIT)+":"+p.Subject)
	if errors.Is(err, app.ErrValidationFailed) {
		return problem.New(http.StatusUnprocessableEntity, CodeValidationFailed, err.Error())
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, siteCodeJSON{SiteCode: site.Code, UpdatedBy: site.UpdatedBy, UpdatedAt: site.UpdatedAt})
}
