package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type ActivityLogRow struct {
	ID          string          `json:"id"`
	UserID      *string         `json:"userId"`
	Action      *string         `json:"action"`
	EntityType  *string         `json:"entityType"`
	EntityID    *string         `json:"entityId"`
	Details     json.RawMessage `json:"details"`
	DiffPayload json.RawMessage `json:"diffPayload"`
}

type LegalMatterRow struct {
	ID            string     `json:"id"`
	Number        *string    `json:"number"`
	Title         *string    `json:"title"`
	Kind          *string    `json:"kind"`
	Status        *string    `json:"status"`
	Counterparty  *string    `json:"counterparty"`
	Reference     *string    `json:"reference"`
	NextDate      *time.Time `json:"nextDate"`
	AssigneeID    *string    `json:"assigneeId"`
	AmountAtStake *float64   `json:"amountAtStake"`
	Description   *string    `json:"description"`
	Outcome       *string    `json:"outcome"`
	CreatedByID   *string    `json:"createdById"`
	ClosedAt      *time.Time `json:"closedAt"`
	RemindedFor   *time.Time `json:"remindedFor"`
	CreatedAt     *time.Time `json:"createdAt"`
	UpdatedAt     *time.Time `json:"updatedAt"`
}

func (s *Store) ListActivityLogs(ctx context.Context, limit int) ([]ActivityLogRow, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, action, entity_type, entity_id, details, diff_payload
		FROM system.activity_log
		ORDER BY id DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ActivityLogRow
	for rows.Next() {
		var r ActivityLogRow
		var details, diff []byte
		if err := rows.Scan(&r.ID, &r.UserID, &r.Action, &r.EntityType, &r.EntityID, &details, &diff); err != nil {
			return nil, err
		}
		r.Details = normalizeJSON(details, `null`)
		r.DiffPayload = normalizeJSON(diff, `null`)
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) CreateActivityLog(ctx context.Context, r ActivityLogRow) (ActivityLogRow, error) {
	details := r.Details
	if len(details) == 0 {
		details = json.RawMessage(`null`)
	}
	diff := r.DiffPayload
	if len(diff) == 0 {
		diff = json.RawMessage(`null`)
	}
	var out ActivityLogRow
	var d, df []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO system.activity_log (id, user_id, action, entity_type, entity_id, details, diff_payload)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
		RETURNING id, user_id, action, entity_type, entity_id, details, diff_payload
	`, r.ID, r.UserID, r.Action, r.EntityType, r.EntityID, []byte(details), []byte(diff)).
		Scan(&out.ID, &out.UserID, &out.Action, &out.EntityType, &out.EntityID, &d, &df)
	if err != nil {
		return ActivityLogRow{}, err
	}
	out.Details = normalizeJSON(d, `null`)
	out.DiffPayload = normalizeJSON(df, `null`)
	return out, nil
}

func (s *Store) ListLegalMatters(ctx context.Context) ([]LegalMatterRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, number, title, kind, status, counterparty, reference, next_date, assignee_id,
		       amount_at_stake::float8, description, outcome, created_by_id, closed_at, reminded_for,
		       created_at, updated_at
		FROM system.legal_matter
		ORDER BY COALESCE(next_date, updated_at, created_at) ASC NULLS LAST
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []LegalMatterRow
	for rows.Next() {
		var r LegalMatterRow
		if err := rows.Scan(
			&r.ID, &r.Number, &r.Title, &r.Kind, &r.Status, &r.Counterparty, &r.Reference,
			&r.NextDate, &r.AssigneeID, &r.AmountAtStake, &r.Description, &r.Outcome,
			&r.CreatedByID, &r.ClosedAt, &r.RemindedFor, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) GetLegalMatter(ctx context.Context, id string) (LegalMatterRow, error) {
	var r LegalMatterRow
	err := s.pool.QueryRow(ctx, `
		SELECT id, number, title, kind, status, counterparty, reference, next_date, assignee_id,
		       amount_at_stake::float8, description, outcome, created_by_id, closed_at, reminded_for,
		       created_at, updated_at
		FROM system.legal_matter
		WHERE id = $1
	`, id).Scan(
		&r.ID, &r.Number, &r.Title, &r.Kind, &r.Status, &r.Counterparty, &r.Reference,
		&r.NextDate, &r.AssigneeID, &r.AmountAtStake, &r.Description, &r.Outcome,
		&r.CreatedByID, &r.ClosedAt, &r.RemindedFor, &r.CreatedAt, &r.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return LegalMatterRow{}, pgx.ErrNoRows
	}
	return r, err
}

func (s *Store) UpsertLegalMatter(ctx context.Context, r LegalMatterRow) (LegalMatterRow, error) {
	var out LegalMatterRow
	err := s.pool.QueryRow(ctx, `
		INSERT INTO system.legal_matter (
			id, number, title, kind, status, counterparty, reference, next_date, assignee_id,
			amount_at_stake, description, outcome, created_by_id, closed_at, reminded_for, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, COALESCE($16, now()), now()
		)
		ON CONFLICT (id) DO UPDATE SET
			number = COALESCE(EXCLUDED.number, system.legal_matter.number),
			title = COALESCE(EXCLUDED.title, system.legal_matter.title),
			kind = COALESCE(EXCLUDED.kind, system.legal_matter.kind),
			status = COALESCE(EXCLUDED.status, system.legal_matter.status),
			counterparty = COALESCE(EXCLUDED.counterparty, system.legal_matter.counterparty),
			reference = COALESCE(EXCLUDED.reference, system.legal_matter.reference),
			next_date = COALESCE(EXCLUDED.next_date, system.legal_matter.next_date),
			assignee_id = COALESCE(EXCLUDED.assignee_id, system.legal_matter.assignee_id),
			amount_at_stake = COALESCE(EXCLUDED.amount_at_stake, system.legal_matter.amount_at_stake),
			description = COALESCE(EXCLUDED.description, system.legal_matter.description),
			outcome = COALESCE(EXCLUDED.outcome, system.legal_matter.outcome),
			closed_at = COALESCE(EXCLUDED.closed_at, system.legal_matter.closed_at),
			reminded_for = COALESCE(EXCLUDED.reminded_for, system.legal_matter.reminded_for),
			updated_at = now()
		RETURNING id, number, title, kind, status, counterparty, reference, next_date, assignee_id,
		          amount_at_stake::float8, description, outcome, created_by_id, closed_at, reminded_for,
		          created_at, updated_at
	`, r.ID, r.Number, r.Title, r.Kind, r.Status, r.Counterparty, r.Reference, r.NextDate, r.AssigneeID,
		r.AmountAtStake, r.Description, r.Outcome, r.CreatedByID, r.ClosedAt, r.RemindedFor, r.CreatedAt).
		Scan(
			&out.ID, &out.Number, &out.Title, &out.Kind, &out.Status, &out.Counterparty, &out.Reference,
			&out.NextDate, &out.AssigneeID, &out.AmountAtStake, &out.Description, &out.Outcome,
			&out.CreatedByID, &out.ClosedAt, &out.RemindedFor, &out.CreatedAt, &out.UpdatedAt,
		)
	return out, err
}

func (s *Store) DeleteLegalMatter(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM system.legal_matter WHERE id = $1`, id)
	return err
}
