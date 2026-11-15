package httpapi

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/inventory/internal/postgres"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	g.PUT("/warehouses/:id", h.updateWarehouse)
	g.PUT("/locations/:id", h.updateLocation)
	g.DELETE("/categories/:id", h.deleteCategory)
	g.PUT("/stock/reorder-point", h.setReorderPoint)
	g.PUT("/counts/:id/status", h.updateStockCountStatus)
	g.PUT("/counts/:id/lines", h.recordCountedQuantities)
	g.POST("/counts/:id/approve", h.approveStockCount)
	g.GET("/batches/expiring", h.listExpiringBatches)
	g.GET("/serials", h.listAllInventoryTable("stock_serial", "created_at DESC"))
	g.GET("/packages", h.listAllInventoryTable("stock_package", "created_at DESC"))
	g.GET("/trace-events", h.listAllInventoryTable("stock_trace_event", "created_at DESC"))
	g.GET("/label-jobs", h.listAllInventoryTable("label_print_job", "created_at DESC"))
	g.GET("/transfers", h.listAllInventoryTable("stock_transfer", "created_at DESC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "inventory", []string{
		"goods_receipt", "goods_receipt_line", "product", "product_category",
		"product_packaging_unit", "product_variant", "purchase_order", "purchase_order_line",
		"purchase_requisition", "purchase_requisition_line", "rfq", "rfq_line", "rfq_quote",
		"stock_acknowledgment", "stock_allocation", "stock_allocation_line", "stock_batch",
		"stock_count", "stock_count_line", "stock_item", "stock_level", "stock_location",
		"stock_movement", "stock_package", "stock_serial", "stock_trace_event", "warehouse",
	})
}

func (h *handler) listAllInventoryTable(table, orderBy string) echo.HandlerFunc {
	return func(c echo.Context) error {
		raw, err := h.svc.ListAllInventoryJSON(c.Request().Context(), table, orderBy)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	}
}

func (h *handler) updateWarehouse(c echo.Context) error {
	var in struct {
		Code      *string `json:"code"`
		NameEn    *string `json:"nameEn"`
		NameAr    *string `json:"nameAr"`
		Address   *string `json:"address"`
		IsDefault *bool   `json:"isDefault"`
		IsActive  *bool   `json:"isActive"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.UpdateWarehouseFields(c.Request().Context(), c.Param("id"), in.Code, in.NameEn, in.NameAr, in.Address, in.IsDefault, in.IsActive); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) updateLocation(c echo.Context) error {
	var in struct {
		Code     *string `json:"code"`
		NameEn   *string `json:"nameEn"`
		NameAr   *string `json:"nameAr"`
		Kind     *string `json:"kind"`
		IsActive *bool   `json:"isActive"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.UpdateLocationFields(c.Request().Context(), c.Param("id"), in.Code, in.NameEn, in.NameAr, in.Kind, in.IsActive); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) deleteCategory(c echo.Context) error {
	if err := h.svc.DeleteCategoryByID(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) setReorderPoint(c echo.Context) error {
	var in struct {
		ProductID       string   `json:"productId"`
		VariantID       *string  `json:"variantId"`
		LocationID      *string  `json:"locationId"`
		ReorderPoint    *float64 `json:"reorderPoint"`
		ReorderQuantity *float64 `json:"reorderQuantity"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.SetReorderPoint(c.Request().Context(), in.ProductID, in.VariantID, in.LocationID, in.ReorderPoint, in.ReorderQuantity); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) updateStockCountStatus(c echo.Context) error {
	var in struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.SetStockCountStatus(c.Request().Context(), c.Param("id"), in.Status); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) recordCountedQuantities(c echo.Context) error {
	var in struct {
		Entries []postgres.CountQuantityEntry `json:"entries"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.RecordCountedQuantities(c.Request().Context(), in.Entries); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) approveStockCount(c echo.Context) error {
	var in struct {
		ApprovedByID string `json:"approvedById"`
	}
	_ = c.Bind(&in)
	adjusted, err := h.svc.ApproveStockCount(c.Request().Context(), c.Param("id"), in.ApprovedByID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"adjusted": adjusted, "low": []any{}})
}

func (h *handler) listExpiringBatches(c echo.Context) error {
	days, _ := strconv.Atoi(c.QueryParam("days"))
	raw, err := h.svc.ListExpiringBatches(c.Request().Context(), days)
	if err != nil {
		return err
	}
	return c.JSONBlob(http.StatusOK, raw)
}
