package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/system/internal/app"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

func (h *handler) catalogRoutes(services *echo.Group) {
	services.GET("/services", h.listServices, caller(h.opts.CompanyReaders))
	services.GET("/services/:id", h.getService, caller(h.opts.CompanyReaders))
	services.POST("/services", h.createService, caller(h.opts.CompanyWriters))
	services.PUT("/services/:id", h.updateService, caller(h.opts.CompanyWriters))
	services.DELETE("/services/:id", h.deleteService, caller(h.opts.CompanyWriters))

	services.GET("/projects", h.listProjects, caller(h.opts.CompanyReaders))
	services.GET("/projects/:id", h.getProject, caller(h.opts.CompanyReaders))
	services.POST("/projects", h.createProject, caller(h.opts.CompanyWriters))
	services.PUT("/projects/:id", h.updateProject, caller(h.opts.CompanyWriters))
	services.DELETE("/projects/:id", h.deleteProject, caller(h.opts.CompanyWriters))
}

func (h *handler) listServices(c echo.Context) error {
	activeOnly := c.QueryParam("active") == "true"
	items, err := h.svc.ListServices(c.Request().Context(), activeOnly)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) getService(c echo.Context) error {
	item, err := h.svc.GetService(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, item)
}

func (h *handler) createService(c echo.Context) error {
	var in sqlcdb.CreateServiceParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateService(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) updateService(c echo.Context) error {
	var in sqlcdb.UpdateServiceParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	updated, err := h.svc.UpdateService(c.Request().Context(), in)
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteService(c echo.Context) error {
	if err := h.svc.DeleteService(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listProjects(c echo.Context) error {
	items, err := h.svc.ListProjects(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) getProject(c echo.Context) error {
	item, err := h.svc.GetProject(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, item)
}

func (h *handler) createProject(c echo.Context) error {
	var in sqlcdb.CreateProjectParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateProject(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) updateProject(c echo.Context) error {
	var in sqlcdb.UpdateProjectParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	updated, err := h.svc.UpdateProject(c.Request().Context(), in)
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteProject(c echo.Context) error {
	if err := h.svc.DeleteProject(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
