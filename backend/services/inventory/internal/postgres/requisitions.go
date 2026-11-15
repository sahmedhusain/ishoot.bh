package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

type PurchaseRequisitionRow struct {
	ID             string     `json:"id"`
	Number         string     `json:"number"`
	RequestedByID  *string    `json:"requestedById"`
	DepartmentID   *string    `json:"departmentId"`
	Status         string     `json:"status"`
	NeededBy       *time.Time `json:"neededBy"`
	Note           *string    `json:"note"`
	DecisionNote   *string    `json:"decisionNote"`
	EstimatedTotal *float64   `json:"estimatedTotal"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

func (s *Store) ListPurchaseRequisitions(ctx context.Context) ([]PurchaseRequisitionRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, number, requested_by_id, department_id, status, needed_by, note, decision_note,
		       estimated_total::float8, created_at, updated_at
		FROM inventory.purchase_requisition
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []PurchaseRequisitionRow
	for rows.Next() {
		var r PurchaseRequisitionRow
		if err := rows.Scan(
			&r.ID, &r.Number, &r.RequestedByID, &r.DepartmentID, &r.Status,
			&r.NeededBy, &r.Note, &r.DecisionNote, &r.EstimatedTotal,
			&r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) GetPurchaseRequisition(ctx context.Context, id string) (PurchaseRequisitionRow, error) {
	var r PurchaseRequisitionRow
	err := s.pool.QueryRow(ctx, `
		SELECT id, number, requested_by_id, department_id, status, needed_by, note, decision_note,
		       estimated_total::float8, created_at, updated_at
		FROM inventory.purchase_requisition
		WHERE id = $1
	`, id).Scan(
		&r.ID, &r.Number, &r.RequestedByID, &r.DepartmentID, &r.Status,
		&r.NeededBy, &r.Note, &r.DecisionNote, &r.EstimatedTotal,
		&r.CreatedAt, &r.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return PurchaseRequisitionRow{}, pgx.ErrNoRows
	}
	return r, err
}

func (s *Store) UpsertPurchaseRequisition(ctx context.Context, r PurchaseRequisitionRow) (PurchaseRequisitionRow, error) {
	if r.Status == "" {
		r.Status = "draft"
	}
	var out PurchaseRequisitionRow
	err := s.pool.QueryRow(ctx, `
		INSERT INTO inventory.purchase_requisition (
			id, number, requested_by_id, department_id, status, needed_by, note, decision_note,
			estimated_total, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			COALESCE($9, 0), now(), now()
		)
		ON CONFLICT (id) DO UPDATE SET
			number = COALESCE(NULLIF(EXCLUDED.number, ''), inventory.purchase_requisition.number),
			requested_by_id = COALESCE(EXCLUDED.requested_by_id, inventory.purchase_requisition.requested_by_id),
			department_id = COALESCE(EXCLUDED.department_id, inventory.purchase_requisition.department_id),
			status = EXCLUDED.status,
			needed_by = COALESCE(EXCLUDED.needed_by, inventory.purchase_requisition.needed_by),
			note = COALESCE(EXCLUDED.note, inventory.purchase_requisition.note),
			decision_note = COALESCE(EXCLUDED.decision_note, inventory.purchase_requisition.decision_note),
			estimated_total = COALESCE(EXCLUDED.estimated_total, inventory.purchase_requisition.estimated_total),
			updated_at = now()
		RETURNING id, number, requested_by_id, department_id, status, needed_by, note, decision_note,
		          estimated_total::float8, created_at, updated_at
	`, r.ID, r.Number, r.RequestedByID, r.DepartmentID, r.Status, r.NeededBy, r.Note, r.DecisionNote, r.EstimatedTotal).
		Scan(
			&out.ID, &out.Number, &out.RequestedByID, &out.DepartmentID, &out.Status,
			&out.NeededBy, &out.Note, &out.DecisionNote, &out.EstimatedTotal,
			&out.CreatedAt, &out.UpdatedAt,
		)
	return out, err
}

func (s *Store) DeletePurchaseRequisition(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM inventory.purchase_requisition WHERE id = $1`, id)
	return err
}
