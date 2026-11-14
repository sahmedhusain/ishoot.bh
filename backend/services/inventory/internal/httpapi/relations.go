package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/inventory/internal/app"
	"platform.local/backend/services/inventory/internal/postgres"
)

func (h *handler) listPurchaseOrders(c echo.Context) error {
	rows, err := h.svc.ListPurchaseOrders(c.Request().Context(), c.QueryParam("status"), c.QueryParam("supplierId"), c.QueryParam("warehouseId"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) getPurchaseOrder(c echo.Context) error {
	po, err := h.svc.GetPurchaseOrder(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, po)
}

func (h *handler) createPurchaseOrder(c echo.Context) error {
	var in postgres.PurchaseOrder
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreatePurchaseOrder(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) receivePurchaseOrder(c echo.Context) error {
	var in postgres.ReceivePOInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	gr, err := h.svc.ReceivePurchaseOrder(c.Request().Context(), c.Param("id"), in)
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusCreated, gr)
}
