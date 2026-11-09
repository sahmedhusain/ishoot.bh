// Package postgres stores delivery entities in the delivery schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/delivery/internal/postgres/sqlcdb"
)

const Schema = "delivery"

type DeliverySettings = sqlcdb.DeliveryDeliverySetting
type DeliveryZone = sqlcdb.DeliveryDeliveryZone
type DeliverySlot = sqlcdb.DeliveryDeliverySlot
type Vehicle = sqlcdb.DeliveryVehicle
type RouteSheet = sqlcdb.DeliveryRouteSheet
type Shipment = sqlcdb.DeliveryShipment
type ShipmentEvent = sqlcdb.DeliveryShipmentEvent

type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}

// UnreferencedProofPhotos returns private proof-photo URLs only used by the orders being erased.
func (s *Store) UnreferencedProofPhotos(ctx context.Context, orderIDs []string) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
SELECT DISTINCT target.proof_photo_url
FROM delivery.shipment AS target
WHERE target.order_id = ANY($1::text[])
  AND target.proof_photo_url IS NOT NULL AND target.proof_photo_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM delivery.shipment AS other
    WHERE other.proof_photo_url = target.proof_photo_url
      AND NOT (other.order_id = ANY($1::text[]))
  )
ORDER BY target.proof_photo_url`, orderIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var urls []string
	for rows.Next() {
		var fileURL string
		if err := rows.Scan(&fileURL); err != nil {
			return nil, err
		}
		urls = append(urls, fileURL)
	}
	return urls, rows.Err()
}

// Settings, Zones & Slots
func (s *Store) GetDeliverySettings(ctx context.Context) (DeliverySettings, error) {
	return s.q.GetDeliverySettings(ctx)
}
func (s *Store) UpsertDeliverySettings(ctx context.Context, p sqlcdb.UpsertDeliverySettingsParams) (DeliverySettings, error) {
	return s.q.UpsertDeliverySettings(ctx, p)
}
func (s *Store) ListDeliveryZones(ctx context.Context) ([]DeliveryZone, error) {
	return s.q.ListDeliveryZones(ctx)
}
func (s *Store) GetDeliveryZoneByID(ctx context.Context, id string) (DeliveryZone, error) {
	return s.q.GetDeliveryZoneByID(ctx, id)
}
func (s *Store) CreateDeliveryZone(ctx context.Context, p sqlcdb.CreateDeliveryZoneParams) (DeliveryZone, error) {
	return s.q.CreateDeliveryZone(ctx, p)
}
func (s *Store) ListDeliverySlotsByZone(ctx context.Context, zoneID *string) ([]DeliverySlot, error) {
	return s.q.ListDeliverySlotsByZone(ctx, zoneID)
}
func (s *Store) CreateDeliverySlot(ctx context.Context, p sqlcdb.CreateDeliverySlotParams) (DeliverySlot, error) {
	return s.q.CreateDeliverySlot(ctx, p)
}

// Vehicles & Route Sheets
func (s *Store) ListVehicles(ctx context.Context) ([]Vehicle, error) {
	return s.q.ListVehicles(ctx)
}
func (s *Store) GetVehicleByID(ctx context.Context, id string) (Vehicle, error) {
	return s.q.GetVehicleByID(ctx, id)
}
func (s *Store) CreateVehicle(ctx context.Context, p sqlcdb.CreateVehicleParams) (Vehicle, error) {
	return s.q.CreateVehicle(ctx, p)
}
func (s *Store) ListRouteSheets(ctx context.Context) ([]RouteSheet, error) {
	return s.q.ListRouteSheets(ctx)
}
func (s *Store) GetRouteSheetByID(ctx context.Context, id string) (RouteSheet, error) {
	return s.q.GetRouteSheetByID(ctx, id)
}
func (s *Store) CreateRouteSheet(ctx context.Context, p sqlcdb.CreateRouteSheetParams) (RouteSheet, error) {
	return s.q.CreateRouteSheet(ctx, p)
}
func (s *Store) UpdateRouteSheetStatus(ctx context.Context, p sqlcdb.UpdateRouteSheetStatusParams) (RouteSheet, error) {
	return s.q.UpdateRouteSheetStatus(ctx, p)
}

// Shipments & Events
func (s *Store) ListShipments(ctx context.Context) ([]Shipment, error) {
	return s.q.ListShipments(ctx)
}
func (s *Store) GetShipmentByID(ctx context.Context, id string) (Shipment, error) {
	return s.q.GetShipmentByID(ctx, id)
}
func (s *Store) GetShipmentByNumber(ctx context.Context, number string) (Shipment, error) {
	return s.q.GetShipmentByNumber(ctx, number)
}
func (s *Store) GetShipmentByTrackingToken(ctx context.Context, token string) (Shipment, error) {
	return s.q.GetShipmentByTrackingToken(ctx, token)
}
func (s *Store) ListShipmentsByOrder(ctx context.Context, orderID string) ([]Shipment, error) {
	return s.q.ListShipmentsByOrder(ctx, orderID)
}
func (s *Store) ListShipmentsByDriver(ctx context.Context, p sqlcdb.ListShipmentsByDriverParams) ([]Shipment, error) {
	return s.q.ListShipmentsByDriver(ctx, p)
}
func (s *Store) CreateShipment(ctx context.Context, p sqlcdb.CreateShipmentParams) (Shipment, error) {
	return s.q.CreateShipment(ctx, p)
}
func (s *Store) UpdateShipmentStatus(ctx context.Context, p sqlcdb.UpdateShipmentStatusParams) (Shipment, error) {
	return s.q.UpdateShipmentStatus(ctx, p)
}
func (s *Store) AssignShipmentDriver(ctx context.Context, p sqlcdb.AssignShipmentDriverParams) (Shipment, error) {
	return s.q.AssignShipmentDriver(ctx, p)
}
func (s *Store) RecordProofOfDelivery(ctx context.Context, p sqlcdb.RecordProofOfDeliveryParams) (Shipment, error) {
	return s.q.RecordProofOfDelivery(ctx, p)
}
func (s *Store) ListShipmentEvents(ctx context.Context, shipmentID string) ([]ShipmentEvent, error) {
	return s.q.ListShipmentEvents(ctx, shipmentID)
}
func (s *Store) CreateShipmentEvent(ctx context.Context, p sqlcdb.CreateShipmentEventParams) (ShipmentEvent, error) {
	return s.q.CreateShipmentEvent(ctx, p)
}
