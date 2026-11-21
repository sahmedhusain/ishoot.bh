package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

func (s *Store) UpdateWarehouseFields(ctx context.Context, id string, code, nameEn, nameAr, address *string, isDefault, isActive *bool) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE inventory.warehouse
		SET code = COALESCE($2, code),
		    name_en = COALESCE($3, name_en),
		    name_ar = COALESCE($4, name_ar),
		    address = COALESCE($5, address),
		    is_default = COALESCE($6, is_default),
		    is_active = COALESCE($7, is_active),
		    updated_at = now()
		WHERE id = $1
	`, id, code, nameEn, nameAr, address, isDefault, isActive)
	return err
}

func (s *Store) UpdateLocationFields(ctx context.Context, id string, code, name *string, isActive *bool) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE inventory.stock_location
		SET code = COALESCE($2, code),
		    name = COALESCE($3, name),
		    is_active = COALESCE($4, is_active)
		WHERE id = $1
	`, id, code, name, isActive)
	return err
}

func (s *Store) DeleteCategoryByID(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM inventory.product_category WHERE id = $1`, id)
	return err
}

func (s *Store) SetReorderPoint(ctx context.Context, productID string, variantID, locationID *string, reorderPoint, reorderQty *float64) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE inventory.stock_level
		SET reorder_point = $4,
		    updated_at = now()
		WHERE product_id = $1
		  AND ($2::text IS NULL OR variant_id = $2)
		  AND ($3::text IS NULL OR location_id = $3)
	`, productID, variantID, locationID, reorderPoint)
	if err != nil {
		return err
	}
	if reorderQty != nil {
		_, err = s.pool.Exec(ctx, `
			UPDATE inventory.stock_item
			SET reorder_point = COALESCE($2, reorder_point),
			    reorder_quantity = $3,
			    updated_at = now()
			WHERE product_id = $1
		`, productID, reorderPoint, reorderQty)
	}
	return err
}

func (s *Store) SetStockCountStatus(ctx context.Context, countID, status string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE inventory.stock_count
		SET status = $2, updated_at = now()
		WHERE id = $1
	`, countID, status)
	return err
}

type CountQuantityEntry struct {
	LineID  string  `json:"lineId"`
	Counted float64 `json:"counted"`
	Note    *string `json:"note"`
}

func (s *Store) RecordCountedQuantities(ctx context.Context, entries []CountQuantityEntry) error {
	for _, e := range entries {
		if _, err := s.pool.Exec(ctx, `
			UPDATE inventory.stock_count_line
			SET counted_quantity = $2,
			    counted = $2,
			    variance = $2 - COALESCE(system_quantity, 0),
			    note = COALESCE($3, note)
			WHERE id = $1
		`, e.LineID, e.Counted, e.Note); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ApproveStockCount(ctx context.Context, countID, approvedByID string) (int, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, product_id, variant_id, location_id, variance::float8
		FROM inventory.stock_count_line
		WHERE count_id = $1 AND COALESCE(variance, 0) <> 0
	`, countID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type adj struct {
		lineID, productID string
		variantID, locID  *string
		variance          float64
	}
	var adjs []adj
	for rows.Next() {
		var a adj
		if err := rows.Scan(&a.lineID, &a.productID, &a.variantID, &a.locID, &a.variance); err != nil {
			return 0, err
		}
		adjs = append(adjs, a)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	for _, a := range adjs {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO inventory.stock_movement (
				id, product_id, variant_id, location_id, movement_type, type, quantity, source_type, source_id, note, created_by_id, created_at
			) VALUES (
				$1, $2, $3, $4, 'count_adjustment', 'count_adjustment', $5, 'stock_count', $6, 'Approved stock count adjustment', NULLIF($7, ''), now()
			)
		`, uuid.NewString(), a.productID, a.variantID, a.locID, a.variance, countID, approvedByID)
		if err != nil {
			return 0, err
		}
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE inventory.stock_count
		SET status = 'approved', approved_by_id = NULLIF($2, ''), approved_at = now(), updated_at = now()
		WHERE id = $1
	`, countID, approvedByID)
	return len(adjs), err
}

func (s *Store) ListExpiringBatches(ctx context.Context, days int) (json.RawMessage, error) {
	if days <= 0 {
		days = 30
	}
	var raw []byte
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(json_agg(b ORDER BY expiry_date ASC), '[]'::json)
		FROM inventory.stock_batch b
		WHERE expiry_date IS NOT NULL
		  AND expiry_date <= now() + make_interval(days => $1)
	`, days).Scan(&raw)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}
	return json.RawMessage(raw), nil
}

func (s *Store) ListAllInventoryJSON(ctx context.Context, table, orderBy string) (json.RawMessage, error) {
	var raw []byte
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(json_agg(t ORDER BY `+orderBy+`), '[]'::json) FROM inventory.`+table+` t`).Scan(&raw)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}
	return json.RawMessage(raw), nil
}
