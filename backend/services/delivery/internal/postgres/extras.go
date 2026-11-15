package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

type CourierAgencyRow struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	ContactName *string   `json:"contactName"`
	Email       *string   `json:"email"`
	Phone       *string   `json:"phone"`
	APIEndpoint *string   `json:"apiEndpoint"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CODSettlementRow struct {
	ID              string     `json:"id"`
	SheetID         *string    `json:"sheetId"`
	DriverID        *string    `json:"driverId"`
	AmountCollected float64    `json:"amountCollected"`
	AmountSettled   float64    `json:"amountSettled"`
	Status          string     `json:"status"`
	SettledAt       *time.Time `json:"settledAt"`
	CreatedAt       time.Time  `json:"createdAt"`
}

func (s *Store) ListCourierAgencies(ctx context.Context) ([]CourierAgencyRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, contact_name, email, phone, api_endpoint, is_active, created_at
		FROM delivery.courier_agency
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CourierAgencyRow
	for rows.Next() {
		var r CourierAgencyRow
		if err := rows.Scan(&r.ID, &r.Name, &r.ContactName, &r.Email, &r.Phone, &r.APIEndpoint, &r.IsActive, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) UpsertCourierAgency(ctx context.Context, r CourierAgencyRow) (CourierAgencyRow, error) {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	var out CourierAgencyRow
	err := s.pool.QueryRow(ctx, `
		INSERT INTO delivery.courier_agency (id, name, contact_name, email, phone, api_endpoint, is_active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			contact_name = EXCLUDED.contact_name,
			email = EXCLUDED.email,
			phone = EXCLUDED.phone,
			api_endpoint = EXCLUDED.api_endpoint,
			is_active = EXCLUDED.is_active
		RETURNING id, name, contact_name, email, phone, api_endpoint, is_active, created_at
	`, r.ID, r.Name, r.ContactName, r.Email, r.Phone, r.APIEndpoint, r.IsActive).
		Scan(&out.ID, &out.Name, &out.ContactName, &out.Email, &out.Phone, &out.APIEndpoint, &out.IsActive, &out.CreatedAt)
	return out, err
}

func (s *Store) DeleteCourierAgency(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM delivery.courier_agency WHERE id = $1`, id)
	return err
}

func (s *Store) UpdateDeliverySlot(ctx context.Context, id string, weekday int32, slotStart, slotEnd string, capacity int32, isActive bool) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE delivery.delivery_slot
		SET weekday = $2, slot_start = $3, slot_end = $4, capacity = $5, is_active = $6
		WHERE id = $1
	`, id, weekday, slotStart, slotEnd, capacity, isActive)
	return err
}

func (s *Store) DeleteDeliverySlot(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM delivery.delivery_slot WHERE id = $1`, id)
	return err
}

func (s *Store) UpdateShipmentStatusAndEvent(ctx context.Context, id, toStatus, note, actorID string, codCollected *float64, trackingNumber *string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE delivery.shipment
		SET status = $2,
		    cod_collected = COALESCE($3, cod_collected),
		    tracking_number = COALESCE($4, tracking_number),
		    updated_at = now()
		WHERE id = $1
	`, id, toStatus, codCollected, trackingNumber)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO delivery.shipment_event (id, shipment_id, status, note, actor_id, created_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), now())
	`, uuid.NewString(), id, toStatus, note, actorID)
	return err
}

func (s *Store) ListCODSettlements(ctx context.Context) ([]CODSettlementRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, sheet_id, driver_id, amount_collected::float8, amount_settled::float8, status, settled_at, created_at
		FROM delivery.cod_settlement
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CODSettlementRow
	for rows.Next() {
		var r CODSettlementRow
		if err := rows.Scan(&r.ID, &r.SheetID, &r.DriverID, &r.AmountCollected, &r.AmountSettled, &r.Status, &r.SettledAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) UpsertCODSettlement(ctx context.Context, r CODSettlementRow) (CODSettlementRow, error) {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	if r.Status == "" {
		r.Status = "pending"
	}
	var out CODSettlementRow
	err := s.pool.QueryRow(ctx, `
		INSERT INTO delivery.cod_settlement (id, sheet_id, driver_id, amount_collected, amount_settled, status, settled_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now())
		ON CONFLICT (id) DO UPDATE SET
			amount_collected = EXCLUDED.amount_collected,
			amount_settled = EXCLUDED.amount_settled,
			status = EXCLUDED.status,
			settled_at = EXCLUDED.settled_at
		RETURNING id, sheet_id, driver_id, amount_collected::float8, amount_settled::float8, status, settled_at, created_at
	`, r.ID, r.SheetID, r.DriverID, r.AmountCollected, r.AmountSettled, r.Status, r.SettledAt).
		Scan(&out.ID, &out.SheetID, &out.DriverID, &out.AmountCollected, &out.AmountSettled, &out.Status, &out.SettledAt, &out.CreatedAt)
	return out, err
}
