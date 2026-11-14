package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *handler) listShipmentsEnriched(c echo.Context) error {
	rows, err := h.svc.ListShipmentsEnriched(c.Request().Context(), c.QueryParam("orderId"), c.QueryParam("driverId"), c.QueryParam("status"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) listDriverRefs(c echo.Context) error {
	rows, err := h.svc.ListDriverRefs(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) listOrderRefs(c echo.Context) error {
	rows, err := h.svc.ListOrderRefs(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}
