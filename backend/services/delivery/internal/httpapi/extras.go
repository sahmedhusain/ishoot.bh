package httpapi

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/delivery/internal/postgres"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	g.GET("/agencies", h.listCourierAgencies)
	g.POST("/agencies", h.upsertCourierAgency)
	g.PUT("/agencies/:id", h.upsertCourierAgency)
	g.DELETE("/agencies/:id", h.deleteCourierAgency)

	g.PUT("/slots/:id", h.updateDeliverySlot)
	g.DELETE("/slots/:id", h.deleteDeliverySlot)

	g.PUT("/shipments/:id/status", h.updateShipmentStatus)
	g.POST("/shipments/:id/hand-to-agency", h.handShipmentToAgency)

	g.GET("/cod-settlements", h.listCODSettlements)
	g.POST("/cod-settlements", h.upsertCODSettlement)
	g.PUT("/cod-settlements/:id", h.upsertCODSettlement)

	db.RegisterTableRoutes(g, h.svc.Pool(), "delivery", []string{
		"cod_settlement", "courier_agency", "delivery_settings", "delivery_slot",
		"delivery_zone", "driver_ref", "order_ref", "route_sheet", "shipment",
		"shipment_event", "vehicle",
	})
}

func (h *handler) listCourierAgencies(c echo.Context) error {
	items, err := h.svc.ListCourierAgencies(c.Request().Context())
	if err != nil {
		return err
	}
	if items == nil {
		items = []postgres.CourierAgencyRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *handler) upsertCourierAgency(c echo.Context) error {
	var in postgres.CourierAgencyRow
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if c.Param("id") != "" {
		in.ID = c.Param("id")
	}
	saved, err := h.svc.UpsertCourierAgency(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *handler) deleteCourierAgency(c echo.Context) error {
	if err := h.svc.DeleteCourierAgency(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) updateDeliverySlot(c echo.Context) error {
	var in struct {
		Weekday   int32  `json:"weekday"`
		SlotStart string `json:"slotStart"`
		SlotEnd   string `json:"slotEnd"`
		Capacity  int32  `json:"capacity"`
		IsActive  bool   `json:"isActive"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.UpdateDeliverySlot(c.Request().Context(), c.Param("id"), in.Weekday, in.SlotStart, in.SlotEnd, in.Capacity, in.IsActive); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) deleteDeliverySlot(c echo.Context) error {
	if err := h.svc.DeleteDeliverySlot(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) updateShipmentStatus(c echo.Context) error {
	var in struct {
		To           string   `json:"to"`
		Note         string   `json:"note"`
		Reason       string   `json:"reason"`
		CodCollected *float64 `json:"codCollected"`
		ActorID      string   `json:"actorId"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	note := in.Note
	if note == "" {
		note = in.Reason
	}
	if err := h.svc.UpdateShipmentStatus(c.Request().Context(), c.Param("id"), in.To, note, in.ActorID, in.CodCollected, nil); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"id": c.Param("id"), "status": in.To})
}

func (h *handler) handShipmentToAgency(c echo.Context) error {
	var in struct {
		AgencyName     string `json:"agencyName"`
		TrackingNumber string `json:"trackingNumber"`
		Note           string `json:"note"`
		ActorID        string `json:"actorId"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	tracking := in.TrackingNumber
	if tracking == "" {
		tracking = "TRK-" + uuid.NewString()[:8]
	}
	note := in.Note
	if note == "" && in.AgencyName != "" {
		note = "Handed to " + in.AgencyName
	}
	if err := h.svc.UpdateShipmentStatus(c.Request().Context(), c.Param("id"), "dispatched", note, in.ActorID, nil, &tracking); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"id": c.Param("id"), "trackingNumber": tracking, "status": "dispatched"})
}

func (h *handler) listCODSettlements(c echo.Context) error {
	items, err := h.svc.ListCODSettlements(c.Request().Context())
	if err != nil {
		return err
	}
	if items == nil {
		items = []postgres.CODSettlementRow{}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *handler) upsertCODSettlement(c echo.Context) error {
	var in postgres.CODSettlementRow
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if c.Param("id") != "" {
		in.ID = c.Param("id")
	}
	saved, err := h.svc.UpsertCODSettlement(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, saved)
}
