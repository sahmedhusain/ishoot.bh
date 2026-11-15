package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/system/internal/postgres"
)

func (h *handler) operationsDataRoutes(services *echo.Group) {
	services.GET("/activity-logs", h.listActivityLogs, caller(h.opts.ReadCallers))
	services.POST("/activity-logs", h.createActivityLog, caller(h.opts.CompanyWriters))

	services.GET("/legal-matters", h.listLegalMatters, caller(h.opts.ReadCallers))
	services.GET("/legal-matters/:id", h.getLegalMatter, caller(h.opts.ReadCallers))
	services.POST("/legal-matters", h.createLegalMatter, caller(h.opts.CompanyWriters))
	services.PUT("/legal-matters/:id", h.updateLegalMatter, caller(h.opts.CompanyWriters))
	services.DELETE("/legal-matters/:id", h.deleteLegalMatter, caller(h.opts.CompanyWriters))
}

func (h *handler) listActivityLogs(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	items, err := h.svc.ListActivityLogs(c.Request().Context(), limit)
	if err != nil {
		return err
	}
	if items == nil {
		items = []postgres.ActivityLogRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *handler) createActivityLog(c echo.Context) error {
	var in postgres.ActivityLogRow
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	created, err := h.svc.CreateActivityLog(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listLegalMatters(c echo.Context) error {
	items, err := h.svc.ListLegalMatters(c.Request().Context())
	if err != nil {
		return err
	}
	if items == nil {
		items = []postgres.LegalMatterRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *handler) getLegalMatter(c echo.Context) error {
	item, err := h.svc.GetLegalMatter(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, item)
}

func (h *handler) createLegalMatter(c echo.Context) error {
	var in postgres.LegalMatterRow
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	saved, err := h.svc.UpsertLegalMatter(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, saved)
}

func (h *handler) updateLegalMatter(c echo.Context) error {
	var in postgres.LegalMatterRow
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	in.ID = c.Param("id")
	saved, err := h.svc.UpsertLegalMatter(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *handler) deleteLegalMatter(c echo.Context) error {
	if err := h.svc.DeleteLegalMatter(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
