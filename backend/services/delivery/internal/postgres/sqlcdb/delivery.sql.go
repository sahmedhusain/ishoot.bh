package sqlcdb

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5/pgtype"
	"time"
)

const assignShipmentDriver = `-- name: AssignShipmentDriver :one
UPDATE delivery.shipment SET
    driver_id = $2,
    vehicle_id = $3,
    route_sheet_id = $4,
    route_stop = $5,
    status = 'assigned',
    updated_at = now()
WHERE id = $1
RETURNING id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at
`

type AssignShipmentDriverParams struct {
	ID           string  `json:"id"`
	DriverID     *string `json:"driverId"`
	VehicleID    *string `json:"vehicleId"`
	RouteSheetID *string `json:"routeSheetId"`
	RouteStop    *int32  `json:"routeStop"`
}

func (q *Queries) AssignShipmentDriver(ctx context.Context, arg AssignShipmentDriverParams) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, assignShipmentDriver,
		arg.ID,
		arg.DriverID,
		arg.VehicleID,
		arg.RouteSheetID,
		arg.RouteStop,
	)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createDeliverySlot = `-- name: CreateDeliverySlot :one
INSERT INTO delivery.delivery_slot (
    id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at
`

type CreateDeliverySlotParams struct {
	ID        string  `json:"id"`
	ZoneID    *string `json:"zoneId"`
	Weekday   int32   `json:"weekday"`
	SlotStart string  `json:"slotStart"`
	SlotEnd   string  `json:"slotEnd"`
	Capacity  *int32  `json:"capacity"`
	IsActive  bool    `json:"isActive"`
}

func (q *Queries) CreateDeliverySlot(ctx context.Context, arg CreateDeliverySlotParams) (DeliveryDeliverySlot, error) {
	row := q.db.QueryRow(ctx, createDeliverySlot,
		arg.ID,
		arg.ZoneID,
		arg.Weekday,
		arg.SlotStart,
		arg.SlotEnd,
		arg.Capacity,
		arg.IsActive,
	)
	var i DeliveryDeliverySlot
	err := row.Scan(
		&i.ID,
		&i.ZoneID,
		&i.Weekday,
		&i.SlotStart,
		&i.SlotEnd,
		&i.Capacity,
		&i.IsActive,
		&i.CreatedAt,
	)
	return i, err
}

const createDeliveryZone = `-- name: CreateDeliveryZone :one
INSERT INTO delivery.delivery_zone (
    id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
) RETURNING id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at
`

type CreateDeliveryZoneParams struct {
	ID        string         `json:"id"`
	NameEn    string         `json:"nameEn"`
	NameAr    string         `json:"nameAr"`
	Areas     []string       `json:"areas"`
	Fee       pgtype.Numeric `json:"fee"`
	MinOrder  pgtype.Numeric `json:"minOrder"`
	FreeOver  pgtype.Numeric `json:"freeOver"`
	IsActive  bool           `json:"isActive"`
	SortOrder int32          `json:"sortOrder"`
}

func (q *Queries) CreateDeliveryZone(ctx context.Context, arg CreateDeliveryZoneParams) (DeliveryDeliveryZone, error) {
	row := q.db.QueryRow(ctx, createDeliveryZone,
		arg.ID,
		arg.NameEn,
		arg.NameAr,
		arg.Areas,
		arg.Fee,
		arg.MinOrder,
		arg.FreeOver,
		arg.IsActive,
		arg.SortOrder,
	)
	var i DeliveryDeliveryZone
	err := row.Scan(
		&i.ID,
		&i.NameEn,
		&i.NameAr,
		&i.Areas,
		&i.Fee,
		&i.MinOrder,
		&i.FreeOver,
		&i.IsActive,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createRouteSheet = `-- name: CreateRouteSheet :one
INSERT INTO delivery.route_sheet (
    id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at
`

type CreateRouteSheetParams struct {
	ID        string      `json:"id"`
	Number    string      `json:"number"`
	DriverID  *string     `json:"driverId"`
	VehicleID *string     `json:"vehicleId"`
	Status    string      `json:"status"`
	RunDate   pgtype.Date `json:"runDate"`
}

func (q *Queries) CreateRouteSheet(ctx context.Context, arg CreateRouteSheetParams) (DeliveryRouteSheet, error) {
	row := q.db.QueryRow(ctx, createRouteSheet,
		arg.ID,
		arg.Number,
		arg.DriverID,
		arg.VehicleID,
		arg.Status,
		arg.RunDate,
	)
	var i DeliveryRouteSheet
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.DriverID,
		&i.VehicleID,
		&i.Status,
		&i.RunDate,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createShipment = `-- name: CreateShipment :one
INSERT INTO delivery.shipment (
    id, number, order_id, status, method, zone_id, slot_id, slot_date,
    slot_start, slot_end, promised_by, recipient_name, recipient_phone,
    address, cod_amount, cod_collected, tracking_token, attempts, failure_reason,
    driver_id, vehicle_id, route_sheet_id, route_stop, agency_id, tracking_number,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13,
    $14, $15, $16, $17, $18, $19,
    $20, $21, $22, $23, $24, $25,
    now(), now()
) RETURNING id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at
`

type CreateShipmentParams struct {
	ID             string          `json:"id"`
	Number         string          `json:"number"`
	OrderID        string          `json:"orderId"`
	Status         string          `json:"status"`
	Method         string          `json:"method"`
	ZoneID         *string         `json:"zoneId"`
	SlotID         *string         `json:"slotId"`
	SlotDate       *time.Time      `json:"slotDate"`
	SlotStart      *string         `json:"slotStart"`
	SlotEnd        *string         `json:"slotEnd"`
	PromisedBy     time.Time       `json:"promisedBy"`
	RecipientName  string          `json:"recipientName"`
	RecipientPhone string          `json:"recipientPhone"`
	Address        json.RawMessage `json:"address"`
	CodAmount      pgtype.Numeric  `json:"codAmount"`
	CodCollected   pgtype.Numeric  `json:"codCollected"`
	TrackingToken  string          `json:"trackingToken"`
	Attempts       int32           `json:"attempts"`
	FailureReason  *string         `json:"failureReason"`
	DriverID       *string         `json:"driverId"`
	VehicleID      *string         `json:"vehicleId"`
	RouteSheetID   *string         `json:"routeSheetId"`
	RouteStop      *int32          `json:"routeStop"`
	AgencyID       *string         `json:"agencyId"`
	TrackingNumber *string         `json:"trackingNumber"`
}

func (q *Queries) CreateShipment(ctx context.Context, arg CreateShipmentParams) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, createShipment,
		arg.ID,
		arg.Number,
		arg.OrderID,
		arg.Status,
		arg.Method,
		arg.ZoneID,
		arg.SlotID,
		arg.SlotDate,
		arg.SlotStart,
		arg.SlotEnd,
		arg.PromisedBy,
		arg.RecipientName,
		arg.RecipientPhone,
		arg.Address,
		arg.CodAmount,
		arg.CodCollected,
		arg.TrackingToken,
		arg.Attempts,
		arg.FailureReason,
		arg.DriverID,
		arg.VehicleID,
		arg.RouteSheetID,
		arg.RouteStop,
		arg.AgencyID,
		arg.TrackingNumber,
	)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createShipmentEvent = `-- name: CreateShipmentEvent :one
INSERT INTO delivery.shipment_event (
    id, shipment_id, status, reason, note, by_id, at
) VALUES (
    $1, $2, $3, $4, $5, $6, now()
) RETURNING id, shipment_id, status, reason, note, by_id, at
`

type CreateShipmentEventParams struct {
	ID         string  `json:"id"`
	ShipmentID string  `json:"shipmentId"`
	Status     string  `json:"status"`
	Reason     *string `json:"reason"`
	Note       *string `json:"note"`
	ByID       *string `json:"byId"`
}

func (q *Queries) CreateShipmentEvent(ctx context.Context, arg CreateShipmentEventParams) (DeliveryShipmentEvent, error) {
	row := q.db.QueryRow(ctx, createShipmentEvent,
		arg.ID,
		arg.ShipmentID,
		arg.Status,
		arg.Reason,
		arg.Note,
		arg.ByID,
	)
	var i DeliveryShipmentEvent
	err := row.Scan(
		&i.ID,
		&i.ShipmentID,
		&i.Status,
		&i.Reason,
		&i.Note,
		&i.ByID,
		&i.At,
	)
	return i, err
}

const createVehicle = `-- name: CreateVehicle :one
INSERT INTO delivery.vehicle (
    id, plate, name, kind, notes, is_active, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING id, plate, name, kind, notes, is_active, created_at, updated_at
`

type CreateVehicleParams struct {
	ID       string  `json:"id"`
	Plate    string  `json:"plate"`
	Name     string  `json:"name"`
	Kind     string  `json:"kind"`
	Notes    *string `json:"notes"`
	IsActive bool    `json:"isActive"`
}

func (q *Queries) CreateVehicle(ctx context.Context, arg CreateVehicleParams) (DeliveryVehicle, error) {
	row := q.db.QueryRow(ctx, createVehicle,
		arg.ID,
		arg.Plate,
		arg.Name,
		arg.Kind,
		arg.Notes,
		arg.IsActive,
	)
	var i DeliveryVehicle
	err := row.Scan(
		&i.ID,
		&i.Plate,
		&i.Name,
		&i.Kind,
		&i.Notes,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getDeliverySettings = `-- name: GetDeliverySettings :one
SELECT id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at FROM delivery.delivery_settings WHERE id = 'default' LIMIT 1
`

func (q *Queries) GetDeliverySettings(ctx context.Context) (DeliveryDeliverySetting, error) {
	row := q.db.QueryRow(ctx, getDeliverySettings)
	var i DeliveryDeliverySetting
	err := row.Scan(
		&i.ID,
		&i.Mode,
		&i.SlaHours,
		&i.TimeZone,
		&i.SlotDays,
		&i.LeadMinutes,
		&i.RequireSlot,
		&i.UpdatedAt,
	)
	return i, err
}

const getDeliveryZoneByID = `-- name: GetDeliveryZoneByID :one
SELECT id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at FROM delivery.delivery_zone WHERE id = $1 LIMIT 1
`

func (q *Queries) GetDeliveryZoneByID(ctx context.Context, id string) (DeliveryDeliveryZone, error) {
	row := q.db.QueryRow(ctx, getDeliveryZoneByID, id)
	var i DeliveryDeliveryZone
	err := row.Scan(
		&i.ID,
		&i.NameEn,
		&i.NameAr,
		&i.Areas,
		&i.Fee,
		&i.MinOrder,
		&i.FreeOver,
		&i.IsActive,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getRouteSheetByID = `-- name: GetRouteSheetByID :one
SELECT id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at FROM delivery.route_sheet WHERE id = $1 LIMIT 1
`

func (q *Queries) GetRouteSheetByID(ctx context.Context, id string) (DeliveryRouteSheet, error) {
	row := q.db.QueryRow(ctx, getRouteSheetByID, id)
	var i DeliveryRouteSheet
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.DriverID,
		&i.VehicleID,
		&i.Status,
		&i.RunDate,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getShipmentByID = `-- name: GetShipmentByID :one
SELECT id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at FROM delivery.shipment WHERE id = $1 LIMIT 1
`

func (q *Queries) GetShipmentByID(ctx context.Context, id string) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, getShipmentByID, id)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getShipmentByNumber = `-- name: GetShipmentByNumber :one
SELECT id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at FROM delivery.shipment WHERE number = $1 LIMIT 1
`

func (q *Queries) GetShipmentByNumber(ctx context.Context, number string) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, getShipmentByNumber, number)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getShipmentByTrackingToken = `-- name: GetShipmentByTrackingToken :one
SELECT id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at FROM delivery.shipment WHERE tracking_token = $1 LIMIT 1
`

func (q *Queries) GetShipmentByTrackingToken(ctx context.Context, trackingToken string) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, getShipmentByTrackingToken, trackingToken)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getVehicleByID = `-- name: GetVehicleByID :one
SELECT id, plate, name, kind, notes, is_active, created_at, updated_at FROM delivery.vehicle WHERE id = $1 LIMIT 1
`

func (q *Queries) GetVehicleByID(ctx context.Context, id string) (DeliveryVehicle, error) {
	row := q.db.QueryRow(ctx, getVehicleByID, id)
	var i DeliveryVehicle
	err := row.Scan(
		&i.ID,
		&i.Plate,
		&i.Name,
		&i.Kind,
		&i.Notes,
		&i.IsActive,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const listDeliverySlotsByZone = `-- name: ListDeliverySlotsByZone :many
SELECT id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at FROM delivery.delivery_slot WHERE zone_id = $1 ORDER BY weekday ASC, slot_start ASC
`

func (q *Queries) ListDeliverySlotsByZone(ctx context.Context, zoneID *string) ([]DeliveryDeliverySlot, error) {
	rows, err := q.db.Query(ctx, listDeliverySlotsByZone, zoneID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryDeliverySlot
	for rows.Next() {
		var i DeliveryDeliverySlot
		if err := rows.Scan(
			&i.ID,
			&i.ZoneID,
			&i.Weekday,
			&i.SlotStart,
			&i.SlotEnd,
			&i.Capacity,
			&i.IsActive,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listDeliveryZones = `-- name: ListDeliveryZones :many
SELECT id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at FROM delivery.delivery_zone ORDER BY sort_order ASC, name_en ASC
`

func (q *Queries) ListDeliveryZones(ctx context.Context) ([]DeliveryDeliveryZone, error) {
	rows, err := q.db.Query(ctx, listDeliveryZones)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryDeliveryZone
	for rows.Next() {
		var i DeliveryDeliveryZone
		if err := rows.Scan(
			&i.ID,
			&i.NameEn,
			&i.NameAr,
			&i.Areas,
			&i.Fee,
			&i.MinOrder,
			&i.FreeOver,
			&i.IsActive,
			&i.SortOrder,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listRouteSheets = `-- name: ListRouteSheets :many
SELECT id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at FROM delivery.route_sheet ORDER BY run_date DESC, created_at DESC
`

func (q *Queries) ListRouteSheets(ctx context.Context) ([]DeliveryRouteSheet, error) {
	rows, err := q.db.Query(ctx, listRouteSheets)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryRouteSheet
	for rows.Next() {
		var i DeliveryRouteSheet
		if err := rows.Scan(
			&i.ID,
			&i.Number,
			&i.DriverID,
			&i.VehicleID,
			&i.Status,
			&i.RunDate,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listShipmentEvents = `-- name: ListShipmentEvents :many
SELECT id, shipment_id, status, reason, note, by_id, at FROM delivery.shipment_event WHERE shipment_id = $1 ORDER BY at ASC
`

func (q *Queries) ListShipmentEvents(ctx context.Context, shipmentID string) ([]DeliveryShipmentEvent, error) {
	rows, err := q.db.Query(ctx, listShipmentEvents, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryShipmentEvent
	for rows.Next() {
		var i DeliveryShipmentEvent
		if err := rows.Scan(
			&i.ID,
			&i.ShipmentID,
			&i.Status,
			&i.Reason,
			&i.Note,
			&i.ByID,
			&i.At,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listShipments = `-- name: ListShipments :many
SELECT id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at FROM delivery.shipment ORDER BY created_at DESC
`

func (q *Queries) ListShipments(ctx context.Context) ([]DeliveryShipment, error) {
	rows, err := q.db.Query(ctx, listShipments)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryShipment
	for rows.Next() {
		var i DeliveryShipment
		if err := rows.Scan(
			&i.ID,
			&i.Number,
			&i.OrderID,
			&i.Status,
			&i.Method,
			&i.ZoneID,
			&i.SlotID,
			&i.SlotDate,
			&i.SlotStart,
			&i.SlotEnd,
			&i.PromisedBy,
			&i.RecipientName,
			&i.RecipientPhone,
			&i.Address,
			&i.CodAmount,
			&i.CodCollected,
			&i.TrackingToken,
			&i.Attempts,
			&i.FailureReason,
			&i.OutAt,
			&i.DeliveredAt,
			&i.DriverID,
			&i.VehicleID,
			&i.RouteSheetID,
			&i.RouteStop,
			&i.ProofPhotoUrl,
			&i.ProofSignature,
			&i.AgencyID,
			&i.TrackingNumber,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listShipmentsByDriver = `-- name: ListShipmentsByDriver :many
SELECT id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at FROM delivery.shipment WHERE driver_id = $1 AND status = $2 ORDER BY route_stop ASC, promised_by ASC
`

type ListShipmentsByDriverParams struct {
	DriverID *string `json:"driverId"`
	Status   string  `json:"status"`
}

func (q *Queries) ListShipmentsByDriver(ctx context.Context, arg ListShipmentsByDriverParams) ([]DeliveryShipment, error) {
	rows, err := q.db.Query(ctx, listShipmentsByDriver, arg.DriverID, arg.Status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryShipment
	for rows.Next() {
		var i DeliveryShipment
		if err := rows.Scan(
			&i.ID,
			&i.Number,
			&i.OrderID,
			&i.Status,
			&i.Method,
			&i.ZoneID,
			&i.SlotID,
			&i.SlotDate,
			&i.SlotStart,
			&i.SlotEnd,
			&i.PromisedBy,
			&i.RecipientName,
			&i.RecipientPhone,
			&i.Address,
			&i.CodAmount,
			&i.CodCollected,
			&i.TrackingToken,
			&i.Attempts,
			&i.FailureReason,
			&i.OutAt,
			&i.DeliveredAt,
			&i.DriverID,
			&i.VehicleID,
			&i.RouteSheetID,
			&i.RouteStop,
			&i.ProofPhotoUrl,
			&i.ProofSignature,
			&i.AgencyID,
			&i.TrackingNumber,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listShipmentsByOrder = `-- name: ListShipmentsByOrder :many
SELECT id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at FROM delivery.shipment WHERE order_id = $1 ORDER BY created_at ASC
`

func (q *Queries) ListShipmentsByOrder(ctx context.Context, orderID string) ([]DeliveryShipment, error) {
	rows, err := q.db.Query(ctx, listShipmentsByOrder, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryShipment
	for rows.Next() {
		var i DeliveryShipment
		if err := rows.Scan(
			&i.ID,
			&i.Number,
			&i.OrderID,
			&i.Status,
			&i.Method,
			&i.ZoneID,
			&i.SlotID,
			&i.SlotDate,
			&i.SlotStart,
			&i.SlotEnd,
			&i.PromisedBy,
			&i.RecipientName,
			&i.RecipientPhone,
			&i.Address,
			&i.CodAmount,
			&i.CodCollected,
			&i.TrackingToken,
			&i.Attempts,
			&i.FailureReason,
			&i.OutAt,
			&i.DeliveredAt,
			&i.DriverID,
			&i.VehicleID,
			&i.RouteSheetID,
			&i.RouteStop,
			&i.ProofPhotoUrl,
			&i.ProofSignature,
			&i.AgencyID,
			&i.TrackingNumber,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listVehicles = `-- name: ListVehicles :many
SELECT id, plate, name, kind, notes, is_active, created_at, updated_at FROM delivery.vehicle ORDER BY name ASC
`

func (q *Queries) ListVehicles(ctx context.Context) ([]DeliveryVehicle, error) {
	rows, err := q.db.Query(ctx, listVehicles)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []DeliveryVehicle
	for rows.Next() {
		var i DeliveryVehicle
		if err := rows.Scan(
			&i.ID,
			&i.Plate,
			&i.Name,
			&i.Kind,
			&i.Notes,
			&i.IsActive,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const recordProofOfDelivery = `-- name: RecordProofOfDelivery :one
UPDATE delivery.shipment SET
    proof_photo_url = $2,
    proof_signature = $3,
    cod_collected = $4,
    status = 'delivered',
    delivered_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at
`

type RecordProofOfDeliveryParams struct {
	ID             string         `json:"id"`
	ProofPhotoUrl  *string        `json:"proofPhotoUrl"`
	ProofSignature *string        `json:"proofSignature"`
	CodCollected   pgtype.Numeric `json:"codCollected"`
}

func (q *Queries) RecordProofOfDelivery(ctx context.Context, arg RecordProofOfDeliveryParams) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, recordProofOfDelivery,
		arg.ID,
		arg.ProofPhotoUrl,
		arg.ProofSignature,
		arg.CodCollected,
	)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const updateRouteSheetStatus = `-- name: UpdateRouteSheetStatus :one
UPDATE delivery.route_sheet SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at
`

type UpdateRouteSheetStatusParams struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

func (q *Queries) UpdateRouteSheetStatus(ctx context.Context, arg UpdateRouteSheetStatusParams) (DeliveryRouteSheet, error) {
	row := q.db.QueryRow(ctx, updateRouteSheetStatus, arg.ID, arg.Status)
	var i DeliveryRouteSheet
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.DriverID,
		&i.VehicleID,
		&i.Status,
		&i.RunDate,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const updateShipmentStatus = `-- name: UpdateShipmentStatus :one
UPDATE delivery.shipment SET
    status = $2,
    failure_reason = $3,
    out_at = $4,
    delivered_at = $5,
    updated_at = now()
WHERE id = $1
RETURNING id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at
`

type UpdateShipmentStatusParams struct {
	ID            string     `json:"id"`
	Status        string     `json:"status"`
	FailureReason *string    `json:"failureReason"`
	OutAt         *time.Time `json:"outAt"`
	DeliveredAt   *time.Time `json:"deliveredAt"`
}

func (q *Queries) UpdateShipmentStatus(ctx context.Context, arg UpdateShipmentStatusParams) (DeliveryShipment, error) {
	row := q.db.QueryRow(ctx, updateShipmentStatus,
		arg.ID,
		arg.Status,
		arg.FailureReason,
		arg.OutAt,
		arg.DeliveredAt,
	)
	var i DeliveryShipment
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.OrderID,
		&i.Status,
		&i.Method,
		&i.ZoneID,
		&i.SlotID,
		&i.SlotDate,
		&i.SlotStart,
		&i.SlotEnd,
		&i.PromisedBy,
		&i.RecipientName,
		&i.RecipientPhone,
		&i.Address,
		&i.CodAmount,
		&i.CodCollected,
		&i.TrackingToken,
		&i.Attempts,
		&i.FailureReason,
		&i.OutAt,
		&i.DeliveredAt,
		&i.DriverID,
		&i.VehicleID,
		&i.RouteSheetID,
		&i.RouteStop,
		&i.ProofPhotoUrl,
		&i.ProofSignature,
		&i.AgencyID,
		&i.TrackingNumber,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const upsertDeliverySettings = `-- name: UpsertDeliverySettings :one
INSERT INTO delivery.delivery_settings (
    id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at
) VALUES (
    'default', $1, $2, $3, $4, $5, $6, now()
)
ON CONFLICT (id) DO UPDATE SET
    mode = EXCLUDED.mode,
    sla_hours = EXCLUDED.sla_hours,
    time_zone = EXCLUDED.time_zone,
    slot_days = EXCLUDED.slot_days,
    lead_minutes = EXCLUDED.lead_minutes,
    require_slot = EXCLUDED.require_slot,
    updated_at = now()
RETURNING id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at
`

type UpsertDeliverySettingsParams struct {
	Mode        string  `json:"mode"`
	SlaHours    int32   `json:"slaHours"`
	TimeZone    *string `json:"timeZone"`
	SlotDays    int32   `json:"slotDays"`
	LeadMinutes int32   `json:"leadMinutes"`
	RequireSlot bool    `json:"requireSlot"`
}

func (q *Queries) UpsertDeliverySettings(ctx context.Context, arg UpsertDeliverySettingsParams) (DeliveryDeliverySetting, error) {
	row := q.db.QueryRow(ctx, upsertDeliverySettings,
		arg.Mode,
		arg.SlaHours,
		arg.TimeZone,
		arg.SlotDays,
		arg.LeadMinutes,
		arg.RequireSlot,
	)
	var i DeliveryDeliverySetting
	err := row.Scan(
		&i.ID,
		&i.Mode,
		&i.SlaHours,
		&i.TimeZone,
		&i.SlotDays,
		&i.LeadMinutes,
		&i.RequireSlot,
		&i.UpdatedAt,
	)
	return i, err
}
