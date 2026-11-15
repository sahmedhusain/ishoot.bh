package httpapi

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/inventory/internal/postgres"
)

func (h *handler) requisitionRoutes(g *echo.Group) {
	g.GET("/requisitions", h.listPurchaseRequisitions)
	g.POST("/requisitions", h.createPurchaseRequisition)
	g.GET("/requisitions/:id", h.getPurchaseRequisition)
	g.PUT("/requisitions/:id", h.updatePurchaseRequisition)
	g.DELETE("/requisitions/:id", h.deletePurchaseRequisition)
}

func (h *handler) listPurchaseRequisitions(c echo.Context) error {
	items, err := h.svc.ListPurchaseRequisitions(c.Request().Context())
	if err != nil {
		return err
	}
	if items == nil {
		items = []postgres.PurchaseRequisitionRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *handler) getPurchaseRequisition(c echo.Context) error {
	item, err := h.svc.GetPurchaseRequisition(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, item)
}

func (h *handler) createPurchaseRequisition(c echo.Context) error {
	var in postgres.PurchaseRequisitionRow
	if err := httpx.BindJSON(c, &in, 1<<20); err != nil {
		return err
	}
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Number == "" {
		in.Number = "PR-" + in.ID[:8]
	}
	saved, err := h.svc.UpsertPurchaseRequisition(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, saved)
}

func (h *handler) updatePurchaseRequisition(c echo.Context) error {
	var in postgres.PurchaseRequisitionRow
	if err := httpx.BindJSON(c, &in, 1<<20); err != nil {
		return err
	}
	in.ID = c.Param("id")
	saved, err := h.svc.UpsertPurchaseRequisition(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *handler) deletePurchaseRequisition(c echo.Context) error {
	if err := h.svc.DeletePurchaseRequisition(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
