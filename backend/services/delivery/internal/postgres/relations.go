package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
)

type OrderRef struct {
	OrderID        string    `json:"orderId"`
	OrderNumber    string    `json:"orderNumber"`
	CustomerID     *string   `json:"customerId,omitempty"`
	ContactID      *string   `json:"contactId,omitempty"`
	RecipientName  string    `json:"recipientName"`
	RecipientPhone string    `json:"recipientPhone"`
	Status         string    `json:"status"`
	Total          float64   `json:"total"`
	Currency       string    `json:"currency"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type DriverRef struct {
	EmployeeID   string    `json:"employeeId"`
	UserID       *string   `json:"userId,omitempty"`
	NameEn       string    `json:"nameEn"`
	NameAr       string    `json:"nameAr"`
	Phone        *string   `json:"phone,omitempty"`
	DepartmentID *string   `json:"departmentId,omitempty"`
	Status       string    `json:"status"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type EnrichedShipment struct {
	ID            string         `json:"id"`
	Number        string         `json:"number"`
	OrderID       string         `json:"orderId"`
	OrderNumber   string         `json:"orderNumber,omitempty"`
	CustomerID    *string        `json:"customerId,omitempty"`
	Status        string         `json:"status"`
	Method        string         `json:"method"`
	ZoneID        *string        `json:"zoneId,omitempty"`
	ZoneNameEn    string         `json:"zoneNameEn,omitempty"`
	ZoneNameAr    string         `json:"zoneNameAr,omitempty"`
	SlotDate      *time.Time     `json:"slotDate,omitempty"`
	SlotStart     *string        `json:"slotStart,omitempty"`
	SlotEnd       *string        `json:"slotEnd,omitempty"`
	PromisedBy    time.Time      `json:"promisedBy"`
	RecipientName string         `json:"recipientName"`
	RecipientPhone string        `json:"recipientPhone"`
	Address       map[string]any `json:"address,omitempty"`
	TrackingToken string         `json:"trackingToken"`
	TrackingNumber *string       `json:"trackingNumber,omitempty"`
	DriverID      *string        `json:"driverId,omitempty"`
	DriverNameEn  string         `json:"driverNameEn,omitempty"`
	DriverNameAr  string         `json:"driverNameAr,omitempty"`
	DriverPhone   *string        `json:"driverPhone,omitempty"`
	VehicleID     *string        `json:"vehicleId,omitempty"`
	VehiclePlate  *string        `json:"vehiclePlate,omitempty"`
	CodAmount     float64        `json:"codAmount"`
	CodCollected  float64        `json:"codCollected"`
	DeliveredAt   *time.Time     `json:"deliveredAt,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
}

func (s *Store) ListShipmentsEnriched(ctx context.Context, orderID, driverID, status string) ([]EnrichedShipment, error) {
	q := `SELECT s.id, s.number, s.order_id, COALESCE(oref.order_number, ''), oref.customer_id,
	             s.status, s.method, s.zone_id, COALESCE(z.name_en, ''), COALESCE(z.name_ar, ''),
	             s.slot_date, s.slot_start, s.slot_end, s.promised_by, s.recipient_name, s.recipient_phone,
	             s.address, s.tracking_token, s.tracking_number, s.driver_id, COALESCE(d.name_en, ''),
	             COALESCE(d.name_ar, ''), d.phone, s.vehicle_id, v.plate,
	             s.cod_amount::float8, s.cod_collected::float8, s.delivered_at, s.created_at
	      FROM delivery.shipment s
	      LEFT JOIN delivery.delivery_zone z ON z.id = s.zone_id
	      LEFT JOIN delivery.driver_ref d ON (d.employee_id = s.driver_id OR d.user_id = s.driver_id)
	      LEFT JOIN delivery.order_ref oref ON oref.order_id = s.order_id
	      LEFT JOIN delivery.vehicle v ON v.id = s.vehicle_id
	      WHERE 1=1`
	var args []any
	idx := 1
	if orderID != "" {
		q += fmt.Sprintf(" AND s.order_id = $%d", idx)
		args = append(args, orderID)
		idx++
	}
	if driverID != "" {
		q += fmt.Sprintf(" AND s.driver_id = $%d", idx)
		args = append(args, driverID)
		idx++
	}
	if status != "" {
		q += fmt.Sprintf(" AND s.status = $%d", idx)
		args = append(args, status)
		idx++
	}
	q += ` ORDER BY s.created_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EnrichedShipment, 0)
	for rows.Next() {
		var es EnrichedShipment
		var addrRaw []byte
		if err := rows.Scan(
			&es.ID, &es.Number, &es.OrderID, &es.OrderNumber, &es.CustomerID,
			&es.Status, &es.Method, &es.ZoneID, &es.ZoneNameEn, &es.ZoneNameAr,
			&es.SlotDate, &es.SlotStart, &es.SlotEnd, &es.PromisedBy, &es.RecipientName, &es.RecipientPhone,
			&addrRaw, &es.TrackingToken, &es.TrackingNumber, &es.DriverID, &es.DriverNameEn,
			&es.DriverNameAr, &es.DriverPhone, &es.VehicleID, &es.VehiclePlate,
			&es.CodAmount, &es.CodCollected, &es.DeliveredAt, &es.CreatedAt,
		); err != nil {
			return nil, err
		}
		if len(addrRaw) > 0 {
			_ = json.Unmarshal(addrRaw, &es.Address)
		}
		out = append(out, es)
	}
	return out, rows.Err()
}

func (s *Store) ListDriverRefs(ctx context.Context) ([]DriverRef, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT employee_id, user_id, name_en, name_ar, phone, department_id, status, updated_at
		FROM delivery.driver_ref ORDER BY name_en ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]DriverRef, 0)
	for rows.Next() {
		var d DriverRef
		if err := rows.Scan(&d.EmployeeID, &d.UserID, &d.NameEn, &d.NameAr, &d.Phone, &d.DepartmentID, &d.Status, &d.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) ListOrderRefs(ctx context.Context) ([]OrderRef, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT order_id, order_number, customer_id, contact_id, recipient_name, recipient_phone, status, total::float8, currency, updated_at
		FROM delivery.order_ref ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]OrderRef, 0)
	for rows.Next() {
		var o OrderRef
		if err := rows.Scan(&o.OrderID, &o.OrderNumber, &o.CustomerID, &o.ContactID, &o.RecipientName, &o.RecipientPhone, &o.Status, &o.Total, &o.Currency, &o.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Store) UpsertOrderRef(ctx context.Context, consumer, eventID string, o OrderRef) error {
	if s.pool == nil || o.OrderID == "" {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO delivery.order_ref (order_id, order_number, customer_id, contact_id, recipient_name, recipient_phone, status, total, currency, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
			ON CONFLICT (order_id) DO UPDATE SET
				order_number = CASE WHEN EXCLUDED.order_number <> '' THEN EXCLUDED.order_number ELSE delivery.order_ref.order_number END,
				customer_id = COALESCE(EXCLUDED.customer_id, delivery.order_ref.customer_id),
				contact_id = COALESCE(EXCLUDED.contact_id, delivery.order_ref.contact_id),
				recipient_name = CASE WHEN EXCLUDED.recipient_name <> '' THEN EXCLUDED.recipient_name ELSE delivery.order_ref.recipient_name END,
				recipient_phone = CASE WHEN EXCLUDED.recipient_phone <> '' THEN EXCLUDED.recipient_phone ELSE delivery.order_ref.recipient_phone END,
				status = CASE WHEN EXCLUDED.status <> '' THEN EXCLUDED.status ELSE delivery.order_ref.status END,
				total = CASE WHEN EXCLUDED.total > 0 THEN EXCLUDED.total ELSE delivery.order_ref.total END,
				currency = CASE WHEN EXCLUDED.currency <> '' THEN EXCLUDED.currency ELSE delivery.order_ref.currency END,
				updated_at = now()`,
			o.OrderID, o.OrderNumber, o.CustomerID, o.ContactID, o.RecipientName, o.RecipientPhone, o.Status, o.Total, o.Currency,
		)
		return err
	})
}

func (s *Store) UpsertDriverRef(ctx context.Context, consumer, eventID string, d DriverRef) error {
	if s.pool == nil || d.EmployeeID == "" {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		if d.Status == "" {
			d.Status = "active"
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO delivery.driver_ref (employee_id, user_id, name_en, name_ar, phone, department_id, status, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,now())
			ON CONFLICT (employee_id) DO UPDATE SET
				user_id = COALESCE(EXCLUDED.user_id, delivery.driver_ref.user_id),
				name_en = CASE WHEN EXCLUDED.name_en <> '' THEN EXCLUDED.name_en ELSE delivery.driver_ref.name_en END,
				name_ar = CASE WHEN EXCLUDED.name_ar <> '' THEN EXCLUDED.name_ar ELSE delivery.driver_ref.name_ar END,
				phone = COALESCE(EXCLUDED.phone, delivery.driver_ref.phone),
				department_id = COALESCE(EXCLUDED.department_id, delivery.driver_ref.department_id),
				status = EXCLUDED.status,
				updated_at = now()`,
			d.EmployeeID, d.UserID, d.NameEn, d.NameAr, d.Phone, d.DepartmentID, d.Status,
		)
		return err
	})
}
