package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/commerce/internal/app"
)

func (h *handler) getOrderRelations(c echo.Context) error {
	rel, err := h.svc.GetOrderRelations(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, rel)
}

func (h *handler) listWarehouseRefs(c echo.Context) error {
	rows, err := h.svc.ListWarehouseRefs(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}
