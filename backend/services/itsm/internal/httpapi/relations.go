package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/itsm/internal/postgres"
)

func (h *handler) getTicketLinks(c echo.Context) error {
	links, err := h.svc.GetTicketLinks(c.Request().Context(), c.Param("id"))
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, links)
}

func (h *handler) updateTicketLinks(c echo.Context) error {
	var in postgres.TicketLinks
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	links, err := h.svc.UpdateTicketLinks(c.Request().Context(), c.Param("id"), in)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, links)
}

func (h *handler) listAssets(c echo.Context) error {
	rows, err := h.svc.ListAssets(c.Request().Context(), c.QueryParam("status"), c.QueryParam("categoryId"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) saveAsset(c echo.Context) error {
	var in postgres.Asset
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if id := c.Param("id"); id != "" {
		in.ID = id
	}
	if in.Name == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "name is required")
	}
	saved, err := h.svc.SaveAsset(c.Request().Context(), in)
	if err != nil {
		return err
	}
	status := http.StatusCreated
	if c.Param("id") != "" {
		status = http.StatusOK
	}
	return c.JSON(status, saved)
}

func (h *handler) deleteAsset(c echo.Context) error {
	if err := h.svc.DeleteAsset(c.Request().Context(), c.Param("id")); err != nil {
		return toProblem(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listAssetHandovers(c echo.Context) error {
	rows, err := h.svc.ListAssetHandovers(c.Request().Context(), c.QueryParam("assetId"), c.QueryParam("employeeId"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) saveAssetHandover(c echo.Context) error {
	var in postgres.AssetHandover
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if id := c.Param("id"); id != "" {
		in.ID = id
	}
	if in.AssetID == "" || in.EmployeeID == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "assetId and employeeId are required")
	}
	saved, err := h.svc.SaveAssetHandover(c.Request().Context(), in)
	if err != nil {
		return err
	}
	status := http.StatusCreated
	if c.Param("id") != "" {
		status = http.StatusOK
	}
	return c.JSON(status, saved)
}

func (h *handler) listStaffRef(c echo.Context) error {
	rows, err := h.svc.ListStaffRef(c.Request().Context(), c.QueryParam("status"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}
