package httpapi
import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/system/internal/app"
)
func (h *handler) companyRoutes(e *echo.Echo) {
	service := e.Group("/v1/system", authn.Require(h.opts.Verifier, authn.RealmService))
	allowed := func(c echo.Context, callers []string) (authn.Principal, error) {
		p, _ := authn.PrincipalFrom(c.Request().Context())
		if !slices.Contains(callers, p.Subject) {
			return p, problem.Forbidden("")
		}
		return p, nil
	}
	service.GET("/company", func(c echo.Context) error {
		if _, err := allowed(c, h.opts.CompanyReaders); err != nil {
			return err
		}
		return h.company(c)
	})
	service.PUT("/company", func(c echo.Context) error {
		p, err := allowed(c, h.opts.CompanyWriters)
		if err != nil {
			return err
		}
		var in struct {
			Values	map[string]json.RawMessage	`json:"values" validate:"required"`
			ActorID	string				`json:"actorId" validate:"required,max=64"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.CompanyBodyLimit); err != nil {
			return err
		}
		out, err := h.svc.SaveCompany(c.Request().Context(), in.Values, "service:"+p.Subject+":"+in.ActorID)
		if err != nil {
			return companyError(err)
		}
		return c.JSON(http.StatusOK, out)
	})
	service.POST("/setup/complete", func(c echo.Context) error {
		p, err := allowed(c, h.opts.CompanyWriters)
		if err != nil {
			return err
		}
		var in struct {
			ActorID string `json:"actorId"`
		}
		_ = httpx.BindJSON(c, &in, h.opts.JSONBodyLimit)
		actor := "service:" + p.Subject
		if in.ActorID != "" {
			actor += ":" + in.ActorID
		}
		out, err := h.svc.CompleteSetup(c.Request().Context(), actor)
		if err != nil {
			return companyError(err)
		}
		return c.JSON(http.StatusOK, out)
	})
	service.PUT("/company/assets/:key", func(c echo.Context) error {
		p, err := allowed(c, h.opts.CompanyWriters)
		if err != nil {
			return err
		}
		var in struct {
			Title	string	`json:"title" validate:"required,max=500"`
			URL	string	`json:"fileUrl" validate:"required,max=2048"`
			ActorID	string	`json:"actorId" validate:"required,max=64"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		if err := h.svc.SaveCompanyAsset(c.Request().Context(), c.Param("key"), in.Title, in.URL, "service:"+p.Subject+":"+in.ActorID); err != nil {
			return companyError(err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	service.GET("/setup/status", func(c echo.Context) error {
		if _, err := allowed(c, h.opts.CompanyReaders); err != nil {
			return err
		}
		return h.setupStatus(c)
	})
	service.POST("/company/currency-use", func(c echo.Context) error {
		p, err := allowed(c, h.opts.CurrencyCallers)
		if err != nil {
			return err
		}
		if err := h.svc.MarkCurrencyUsed(c.Request().Context(), "service:"+p.Subject); err != nil {
			return companyError(err)
		}
		return c.NoContent(http.StatusNoContent)
	})
	service.POST("/sequences/:kind/reservations", func(c echo.Context) error {
		p, err := allowed(c, h.opts.SequenceCallers)
		if err != nil {
			return err
		}
		var in struct {
			Key	string	`json:"idempotencyKey" validate:"required,max=200"`
			Date	string	`json:"documentDate" validate:"required,len=10"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		number, err := h.svc.ReserveNumber(c.Request().Context(), p.Subject, in.Key, c.Param("kind"), in.Date)
		if err != nil {
			return companyError(err)
		}
		return c.JSON(http.StatusOK, map[string]string{"number": number})
	})
	desk := e.Group("/v1/system/desk", authn.Require(h.opts.Verifier, authn.RealmIT))
	desk.GET("/setup/status", h.setupStatus, authz.Require(catalog.ITAccess, "setup", "read"))
	desk.GET("/company", h.company, authz.Require(catalog.ITAccess, "setup", "read"))
	desk.PUT("/company", func(c echo.Context) error {
		var in struct {
			Values map[string]json.RawMessage `json:"values" validate:"required"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.CompanyBodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		out, err := h.svc.SaveCompany(c.Request().Context(), in.Values, "it:"+actor.Subject)
		if err != nil {
			return companyError(err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "setup", "edit"))
	desk.POST("/setup/complete", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		out, err := h.svc.CompleteSetup(c.Request().Context(), "it:"+actor.Subject)
		if err != nil {
			return companyError(err)
		}
		return c.JSON(http.StatusOK, out)
	}, authz.Require(catalog.ITAccess, "setup", "execute"))
	desk.GET("/company/assets", func(c echo.Context) error {
		rows, err := h.svc.CompanyAssets(c.Request().Context())
		if err != nil {
			return companyError(err)
		}
		items := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			items = append(items, map[string]any{"id": row.ID, "assetKey": row.AssetKey, "title": row.Title, "fileUrl": row.FileUrl, "mimeType": row.MimeType, "fileSize": row.FileSize, "createdAt": row.CreatedAt, "updatedAt": row.UpdatedAt})
		}
		return c.JSON(http.StatusOK, map[string]any{"items": items})
	}, authz.Require(catalog.ITAccess, "setup", "read"))
	desk.PUT("/company/assets/:key", func(c echo.Context) error {
		var in struct {
			Title	string	`json:"title" validate:"required,max=500"`
			URL	string	`json:"fileUrl" validate:"required,max=2048"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := h.svc.SaveCompanyAsset(c.Request().Context(), c.Param("key"), in.Title, in.URL, "it:"+actor.Subject); err != nil {
			return companyError(err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "setup", "edit"))
	desk.DELETE("/company/assets/:key", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := h.svc.DeleteCompanyAsset(c.Request().Context(), c.Param("key"), "it:"+actor.Subject); err != nil {
			return companyError(err)
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "setup", "edit"))
}
func (h *handler) company(c echo.Context) error {
	c.Response().Header().Set("Cache-Control", "no-store")
	out, err := h.svc.Company(c.Request().Context())
	if err != nil {
		return companyError(err)
	}
	return c.JSON(http.StatusOK, out)
}
func companyError(err error) error {
	switch {
	case errors.Is(err, app.ErrValidationFailed):
		return problem.Validation()
	case errors.Is(err, app.ErrCompanyMissing):
		return problem.New(http.StatusNotFound, "company_not_configured", "")
	case errors.Is(err, app.ErrCurrencyLocked):
		return problem.New(http.StatusConflict, "company_currency_locked", "")
	case errors.Is(err, app.ErrSequenceBackwards):
		return problem.New(http.StatusConflict, "sequence_backwards", "")
	case errors.Is(err, app.ErrReservationConflict):
		return problem.New(http.StatusConflict, "idempotency_conflict", "")
	case errors.Is(err, app.ErrFileLookupUnavailable):
		return problem.New(http.StatusServiceUnavailable, problem.CodeUnavailable, "")
	default:
		return err
	}
}
func (h *handler) setupStatus(c echo.Context) error {
	c.Response().Header().Set("Cache-Control", "no-store")
	out, err := h.svc.SetupStatus(c.Request().Context())
	if err != nil {
		return companyError(err)
	}
	return c.JSON(http.StatusOK, out)
}
