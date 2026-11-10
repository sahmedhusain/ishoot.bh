package httpapi
import (
	"errors"
	"net/http"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/delivery/api"
	"platform.local/backend/services/delivery/internal/app"
	"platform.local/backend/services/delivery/internal/postgres/sqlcdb"
)
type Options struct {
	Verifier	*authn.Verifier
	Readers		[]string
	Writers		[]string
}
type handler struct {
	svc	*app.Service
	opts	Options
}
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/delivery/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})
	auth := authn.Require(opts.Verifier, authn.RealmService)
	g := e.Group("/v1/delivery", auth, authz.ServiceCallers(opts.Readers, opts.Writers))
	g.GET("/settings", h.getDeliverySettings)
	g.PUT("/settings", h.upsertDeliverySettings)
	g.GET("/zones", h.listDeliveryZones)
	g.POST("/zones", h.createDeliveryZone)
	g.GET("/zones/:id/slots", h.listDeliverySlots)
	g.POST("/zones/:id/slots", h.createDeliverySlot)
	g.GET("/vehicles", h.listVehicles)
	g.POST("/vehicles", h.createVehicle)
	g.GET("/routes", h.listRouteSheets)
	g.POST("/routes", h.createRouteSheet)
	g.PUT("/routes/:id/status", h.updateRouteSheetStatus)
	g.GET("/shipments", h.listShipments)
	g.POST("/shipments", h.createShipment)
	g.GET("/shipments/:id", h.getShipment)
	g.POST("/shipments/:id/assign", h.assignShipmentDriver)
	g.POST("/shipments/:id/proof", h.recordProofOfDelivery)
	g.GET("/shipments/:id/events", h.listShipmentEvents)
	e.GET("/v1/delivery/track/:token", h.trackShipment)
}
func (h *handler) getDeliverySettings(c echo.Context) error {
	settings, err := h.svc.GetDeliverySettings(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, settings)
}
func (h *handler) upsertDeliverySettings(c echo.Context) error {
	var in sqlcdb.UpsertDeliverySettingsParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.UpsertDeliverySettings(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}
func (h *handler) listDeliveryZones(c echo.Context) error {
	zones, err := h.svc.ListDeliveryZones(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, zones)
}
func (h *handler) createDeliveryZone(c echo.Context) error {
	var in sqlcdb.CreateDeliveryZoneParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateDeliveryZone(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listDeliverySlots(c echo.Context) error {
	zoneID := c.Param("id")
	slots, err := h.svc.ListDeliverySlots(c.Request().Context(), &zoneID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, slots)
}
func (h *handler) createDeliverySlot(c echo.Context) error {
	var in sqlcdb.CreateDeliverySlotParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	zid := c.Param("id")
	in.ZoneID = &zid
	res, err := h.svc.CreateDeliverySlot(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listVehicles(c echo.Context) error {
	vehicles, err := h.svc.ListVehicles(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, vehicles)
}
func (h *handler) createVehicle(c echo.Context) error {
	var in sqlcdb.CreateVehicleParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateVehicle(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listRouteSheets(c echo.Context) error {
	sheets, err := h.svc.ListRouteSheets(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, sheets)
}
func (h *handler) createRouteSheet(c echo.Context) error {
	var in sqlcdb.CreateRouteSheetParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateRouteSheet(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) updateRouteSheetStatus(c echo.Context) error {
	var in sqlcdb.UpdateRouteSheetStatusParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.UpdateRouteSheetStatus(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}
func (h *handler) listShipments(c echo.Context) error {
	shipments, err := h.svc.ListShipments(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, shipments)
}
func (h *handler) getShipment(c echo.Context) error {
	sh, err := h.svc.GetShipment(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, sh)
}
func (h *handler) createShipment(c echo.Context) error {
	var in sqlcdb.CreateShipmentParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateShipment(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) assignShipmentDriver(c echo.Context) error {
	var in sqlcdb.AssignShipmentDriverParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.AssignShipmentDriver(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}
func (h *handler) recordProofOfDelivery(c echo.Context) error {
	var in sqlcdb.RecordProofOfDeliveryParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.RecordProofOfDelivery(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}
func (h *handler) listShipmentEvents(c echo.Context) error {
	events, err := h.svc.ListShipmentEvents(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, events)
}
func (h *handler) trackShipment(c echo.Context) error {
	sh, err := h.svc.GetShipmentByTrackingToken(c.Request().Context(), c.Param("token"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, sh)
}
