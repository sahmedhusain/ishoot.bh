package app
import (
	"context"
	"errors"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/delivery/internal/postgres"
	"platform.local/backend/services/delivery/internal/postgres/sqlcdb"
)
var (
	ErrNotFound	= errors.New("delivery resource not found")
	ErrConflict	= errors.New("delivery resource conflict")
)
const (
	EventShipmentDispatched	= "delivery.shipment.dispatched"
	EventShipmentDelivered	= "delivery.shipment.delivered"
	EventShipmentFailed	= "delivery.shipment.failed"
)
type Service struct {
	store		*postgres.Store
	now		func() time.Time
	fileDeleter	PrivateFileDeleter
}
func (s *Service) SetPrivateFileDeleter(deleter PrivateFileDeleter) {
	s.fileDeleter = deleter
}
func New(store *postgres.Store) *Service {
	return &Service{
		store:	store,
		now:	time.Now,
	}
}
func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}
func (s *Service) GetDeliverySettings(ctx context.Context) (postgres.DeliverySettings, error) {
	return s.store.GetDeliverySettings(ctx)
}
func (s *Service) UpsertDeliverySettings(ctx context.Context, in sqlcdb.UpsertDeliverySettingsParams) (postgres.DeliverySettings, error) {
	return s.store.UpsertDeliverySettings(ctx, in)
}
func (s *Service) ListDeliveryZones(ctx context.Context) ([]postgres.DeliveryZone, error) {
	return s.store.ListDeliveryZones(ctx)
}
func (s *Service) CreateDeliveryZone(ctx context.Context, in sqlcdb.CreateDeliveryZoneParams) (postgres.DeliveryZone, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateDeliveryZone(ctx, in)
}
func (s *Service) ListDeliverySlots(ctx context.Context, zoneID *string) ([]postgres.DeliverySlot, error) {
	return s.store.ListDeliverySlotsByZone(ctx, zoneID)
}
func (s *Service) CreateDeliverySlot(ctx context.Context, in sqlcdb.CreateDeliverySlotParams) (postgres.DeliverySlot, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateDeliverySlot(ctx, in)
}
func (s *Service) ListVehicles(ctx context.Context) ([]postgres.Vehicle, error) {
	return s.store.ListVehicles(ctx)
}
func (s *Service) CreateVehicle(ctx context.Context, in sqlcdb.CreateVehicleParams) (postgres.Vehicle, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateVehicle(ctx, in)
}
func (s *Service) ListRouteSheets(ctx context.Context) ([]postgres.RouteSheet, error) {
	return s.store.ListRouteSheets(ctx)
}
func (s *Service) CreateRouteSheet(ctx context.Context, in sqlcdb.CreateRouteSheetParams) (postgres.RouteSheet, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateRouteSheet(ctx, in)
}
func (s *Service) UpdateRouteSheetStatus(ctx context.Context, in sqlcdb.UpdateRouteSheetStatusParams) (postgres.RouteSheet, error) {
	return s.store.UpdateRouteSheetStatus(ctx, in)
}
func (s *Service) ListShipments(ctx context.Context) ([]postgres.Shipment, error) {
	return s.store.ListShipments(ctx)
}
func (s *Service) GetShipment(ctx context.Context, id string) (postgres.Shipment, error) {
	sh, err := s.store.GetShipmentByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Shipment{}, ErrNotFound
		}
		return postgres.Shipment{}, err
	}
	return sh, nil
}
func (s *Service) GetShipmentByTrackingToken(ctx context.Context, token string) (postgres.Shipment, error) {
	sh, err := s.store.GetShipmentByTrackingToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Shipment{}, ErrNotFound
		}
		return postgres.Shipment{}, err
	}
	return sh, nil
}
func (s *Service) CreateShipment(ctx context.Context, in sqlcdb.CreateShipmentParams) (postgres.Shipment, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.TrackingToken == "" {
		in.TrackingToken = uuid.NewString()
	}
	var created postgres.Shipment
	err := s.change(ctx, EventShipmentDispatched, map[string]any{
		"shipment_id":	in.ID,
		"number":	in.Number,
		"order_id":	in.OrderID,
		"promised_by":	in.PromisedBy.Format(time.RFC3339),
	}, func(st *postgres.Store) error {
		var sErr error
		created, sErr = st.CreateShipment(ctx, in)
		if sErr != nil {
			return sErr
		}
		_, evErr := st.CreateShipmentEvent(ctx, sqlcdb.CreateShipmentEventParams{
			ID:		uuid.NewString(),
			ShipmentID:	in.ID,
			Status:		in.Status,
		})
		return evErr
	})
	return created, err
}
func (s *Service) AssignShipmentDriver(ctx context.Context, in sqlcdb.AssignShipmentDriverParams) (postgres.Shipment, error) {
	var updated postgres.Shipment
	err := s.change(ctx, EventShipmentDispatched, map[string]any{
		"shipment_id":	in.ID,
		"driver_id":	in.DriverID,
		"status":	"assigned",
	}, func(st *postgres.Store) error {
		var uErr error
		updated, uErr = st.AssignShipmentDriver(ctx, in)
		if uErr != nil {
			return uErr
		}
		_, evErr := st.CreateShipmentEvent(ctx, sqlcdb.CreateShipmentEventParams{
			ID:		uuid.NewString(),
			ShipmentID:	in.ID,
			Status:		"assigned",
		})
		return evErr
	})
	return updated, err
}
func (s *Service) RecordProofOfDelivery(ctx context.Context, in sqlcdb.RecordProofOfDeliveryParams) (postgres.Shipment, error) {
	var updated postgres.Shipment
	err := s.change(ctx, EventShipmentDelivered, map[string]any{
		"shipment_id":		in.ID,
		"cod_collected":	in.CodCollected,
		"delivered_at":		s.now().Format(time.RFC3339),
	}, func(st *postgres.Store) error {
		var uErr error
		updated, uErr = st.RecordProofOfDelivery(ctx, in)
		if uErr != nil {
			return uErr
		}
		_, evErr := st.CreateShipmentEvent(ctx, sqlcdb.CreateShipmentEventParams{
			ID:		uuid.NewString(),
			ShipmentID:	in.ID,
			Status:		"delivered",
		})
		return evErr
	})
	return updated, err
}
func (s *Service) ListShipmentEvents(ctx context.Context, shipmentID string) ([]postgres.ShipmentEvent, error) {
	return s.store.ListShipmentEvents(ctx, shipmentID)
}
