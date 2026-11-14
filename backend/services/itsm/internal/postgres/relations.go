package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/itsm/internal/domain"
)

type TicketLinks struct {
	TicketID     string  `json:"ticketId"`
	EmployeeID   *string `json:"employeeId,omitempty"`
	DepartmentID *string `json:"departmentId,omitempty"`
	ProjectID    *string `json:"projectId,omitempty"`
	AssetID      *string `json:"assetId,omitempty"`
	DocumentID   *string `json:"documentId,omitempty"`
	AssetRef     *string `json:"assetRef,omitempty"`
}

type Asset struct {
	ID               string         `json:"id"`
	AssetTag         string         `json:"assetTag"`
	CategoryID       *string        `json:"categoryId,omitempty"`
	CategoryName     string         `json:"categoryName,omitempty"`
	Name             string         `json:"name"`
	Brand            *string        `json:"brand,omitempty"`
	Model            *string        `json:"model,omitempty"`
	SerialNumber     *string        `json:"serialNumber,omitempty"`
	PurchaseDate     *time.Time     `json:"purchaseDate,omitempty"`
	PurchaseCost     *float64       `json:"purchaseCost,omitempty"`
	Currency         *string        `json:"currency,omitempty"`
	Supplier         *string        `json:"supplier,omitempty"`
	InvoiceReference *string        `json:"invoiceReference,omitempty"`
	WarrantyUntil    *time.Time     `json:"warrantyUntil,omitempty"`
	Condition        string         `json:"condition"`
	Status           string         `json:"status"`
	Specs            map[string]any `json:"specs,omitempty"`
}

type AssetHandover struct {
	ID           string     `json:"id"`
	Reference    string     `json:"reference"`
	AssetID      string     `json:"assetId"`
	AssetTag     string     `json:"assetTag,omitempty"`
	AssetName    string     `json:"assetName,omitempty"`
	EmployeeID   string     `json:"employeeId"`
	EmployeeName string     `json:"employeeName,omitempty"`
	Kind         string     `json:"kind"`
	Status       string     `json:"status"`
	HandoverDate *time.Time `json:"handoverDate,omitempty"`
	Condition    *string    `json:"condition,omitempty"`
}

type StaffRef struct {
	EmployeeID     string    `json:"employeeId"`
	UserID         *string   `json:"userId,omitempty"`
	EmployeeNumber string    `json:"employeeNumber"`
	NameEn         string    `json:"nameEn"`
	NameAr         string    `json:"nameAr"`
	Email          string    `json:"email"`
	DepartmentID   *string   `json:"departmentId,omitempty"`
	Status         string    `json:"status"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func (s *Store) GetTicketLinks(ctx context.Context, ticketID string) (TicketLinks, error) {
	var out TicketLinks
	err := s.pool.QueryRow(ctx, `
		SELECT id, employee_id, department_id, project_id, asset_id, document_id, asset_ref
		FROM itsm.ticket WHERE id = $1`, ticketID,
	).Scan(&out.TicketID, &out.EmployeeID, &out.DepartmentID, &out.ProjectID, &out.AssetID, &out.DocumentID, &out.AssetRef)
	return out, notFound(err)
}

func (s *Store) UpdateTicketLinks(ctx context.Context, ticketID string, in TicketLinks) (TicketLinks, error) {
	var out TicketLinks
	err := s.pool.QueryRow(ctx, `
		UPDATE itsm.ticket
		SET employee_id = COALESCE(NULLIF($2, ''), employee_id),
		    department_id = COALESCE(NULLIF($3, ''), department_id),
		    project_id = COALESCE(NULLIF($4, ''), project_id),
		    asset_id = COALESCE(NULLIF($5, ''), asset_id),
		    document_id = COALESCE(NULLIF($6, ''), document_id),
		    asset_ref = COALESCE(NULLIF($7, ''), asset_ref),
		    updated_at = now()
		WHERE id = $1
		RETURNING id, employee_id, department_id, project_id, asset_id, document_id, asset_ref`,
		ticketID, in.EmployeeID, in.DepartmentID, in.ProjectID, in.AssetID, in.DocumentID, in.AssetRef,
	).Scan(&out.TicketID, &out.EmployeeID, &out.DepartmentID, &out.ProjectID, &out.AssetID, &out.DocumentID, &out.AssetRef)
	return out, notFound(err)
}

func (s *Store) ListAssets(ctx context.Context, status, categoryID string) ([]Asset, error) {
	q := `SELECT a.id, COALESCE(a.asset_tag,''), a.category_id, COALESCE(c.name_en,''), COALESCE(a.name,''),
	             a.brand, a.model, a.serial_number, a.purchase_date, a.purchase_cost::float8,
	             a.currency, a.supplier, a.invoice_reference, a.warranty_until,
	             COALESCE(a.condition,'good'), COALESCE(a.status,'available'), a.specs
	      FROM itsm.asset a
	      LEFT JOIN itsm.asset_category c ON c.id = a.category_id
	      WHERE 1=1`
	var args []any
	idx := 1
	if status != "" {
		q += fmt.Sprintf(" AND a.status = $%d", idx)
		args = append(args, status)
		idx++
	}
	if categoryID != "" {
		q += fmt.Sprintf(" AND a.category_id = $%d", idx)
		args = append(args, categoryID)
		idx++
	}
	q += ` ORDER BY a.asset_tag ASC, a.name ASC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Asset, 0)
	for rows.Next() {
		var a Asset
		var rawSpecs []byte
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.CategoryID, &a.CategoryName, &a.Name,
			&a.Brand, &a.Model, &a.SerialNumber, &a.PurchaseDate, &a.PurchaseCost,
			&a.Currency, &a.Supplier, &a.InvoiceReference, &a.WarrantyUntil,
			&a.Condition, &a.Status, &rawSpecs,
		); err != nil {
			return nil, err
		}
		if len(rawSpecs) > 0 {
			_ = json.Unmarshal(rawSpecs, &a.Specs)
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) UpsertAsset(ctx context.Context, in Asset) (Asset, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.AssetTag == "" {
		in.AssetTag = "AST-" + strings.ToUpper(in.ID[:8])
	}
	if in.Condition == "" {
		in.Condition = "good"
	}
	if in.Status == "" {
		in.Status = "available"
	}
	var specsRaw []byte
	if in.Specs != nil {
		specsRaw, _ = json.Marshal(in.Specs)
	}
	var out Asset
	var outSpecs []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO itsm.asset (
			id, asset_tag, category_id, name, brand, model, serial_number,
			purchase_date, purchase_cost, currency, supplier, invoice_reference,
			warranty_until, condition, status, specs
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		ON CONFLICT (id) DO UPDATE SET
			asset_tag = EXCLUDED.asset_tag,
			category_id = EXCLUDED.category_id,
			name = EXCLUDED.name,
			brand = EXCLUDED.brand,
			model = EXCLUDED.model,
			serial_number = EXCLUDED.serial_number,
			purchase_date = EXCLUDED.purchase_date,
			purchase_cost = EXCLUDED.purchase_cost,
			currency = EXCLUDED.currency,
			supplier = EXCLUDED.supplier,
			invoice_reference = EXCLUDED.invoice_reference,
			warranty_until = EXCLUDED.warranty_until,
			condition = EXCLUDED.condition,
			status = EXCLUDED.status,
			specs = COALESCE(EXCLUDED.specs, itsm.asset.specs)
		RETURNING id, COALESCE(asset_tag,''), category_id, COALESCE(name,''), brand, model, serial_number,
		          purchase_date, purchase_cost::float8, currency, supplier, invoice_reference,
		          warranty_until, COALESCE(condition,'good'), COALESCE(status,'available'), specs`,
		in.ID, in.AssetTag, in.CategoryID, in.Name, in.Brand, in.Model, in.SerialNumber,
		in.PurchaseDate, in.PurchaseCost, in.Currency, in.Supplier, in.InvoiceReference,
		in.WarrantyUntil, in.Condition, in.Status, specsRaw,
	).Scan(
		&out.ID, &out.AssetTag, &out.CategoryID, &out.Name, &out.Brand, &out.Model, &out.SerialNumber,
		&out.PurchaseDate, &out.PurchaseCost, &out.Currency, &out.Supplier, &out.InvoiceReference,
		&out.WarrantyUntil, &out.Condition, &out.Status, &outSpecs,
	)
	if len(outSpecs) > 0 {
		_ = json.Unmarshal(outSpecs, &out.Specs)
	}
	return out, err
}

func (s *Store) DeleteAsset(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM itsm.asset WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (s *Store) ListAssetHandovers(ctx context.Context, assetID, employeeID string) ([]AssetHandover, error) {
	q := `SELECT h.id, COALESCE(h.reference,''), COALESCE(h.asset_id,''), COALESCE(a.asset_tag,''), COALESCE(a.name,''),
	             COALESCE(h.employee_id,''), COALESCE(sr.name_en,''), COALESCE(h.kind,'issue'),
	             COALESCE(h.status,'active'), h.handover_date, h.condition
	      FROM itsm.asset_handover h
	      LEFT JOIN itsm.asset a ON a.id = h.asset_id
	      LEFT JOIN itsm.staff_ref sr ON sr.employee_id = h.employee_id
	      WHERE 1=1`
	var args []any
	idx := 1
	if assetID != "" {
		q += fmt.Sprintf(" AND h.asset_id = $%d", idx)
		args = append(args, assetID)
		idx++
	}
	if employeeID != "" {
		q += fmt.Sprintf(" AND h.employee_id = $%d", idx)
		args = append(args, employeeID)
		idx++
	}
	q += ` ORDER BY h.handover_date DESC NULLS LAST, h.id DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]AssetHandover, 0)
	for rows.Next() {
		var h AssetHandover
		if err := rows.Scan(
			&h.ID, &h.Reference, &h.AssetID, &h.AssetTag, &h.AssetName,
			&h.EmployeeID, &h.EmployeeName, &h.Kind, &h.Status, &h.HandoverDate, &h.Condition,
		); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (s *Store) UpsertAssetHandover(ctx context.Context, in AssetHandover) (AssetHandover, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Reference == "" {
		in.Reference = "AHO-" + strings.ToUpper(in.ID[:8])
	}
	if in.Kind == "" {
		in.Kind = "issue"
	}
	if in.Status == "" {
		in.Status = "active"
	}
	var out AssetHandover
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			INSERT INTO itsm.asset_handover (id, reference, asset_id, employee_id, kind, status, handover_date, condition)
			VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, now()),$8)
			ON CONFLICT (id) DO UPDATE SET
				asset_id = EXCLUDED.asset_id,
				employee_id = EXCLUDED.employee_id,
				kind = EXCLUDED.kind,
				status = EXCLUDED.status,
				handover_date = COALESCE(EXCLUDED.handover_date, itsm.asset_handover.handover_date),
				condition = EXCLUDED.condition
			RETURNING id, COALESCE(reference,''), COALESCE(asset_id,''), COALESCE(employee_id,''),
			          COALESCE(kind,'issue'), COALESCE(status,'active'), handover_date, condition`,
			in.ID, in.Reference, in.AssetID, in.EmployeeID, in.Kind, in.Status, in.HandoverDate, in.Condition,
		).Scan(&out.ID, &out.Reference, &out.AssetID, &out.EmployeeID, &out.Kind, &out.Status, &out.HandoverDate, &out.Condition)
		if err != nil {
			return err
		}
		if out.AssetID != "" {
			nextAssetStatus := "assigned"
			if out.Kind == "return" || out.Status == "returned" {
				nextAssetStatus = "available"
			}
			_, _ = tx.Exec(ctx, `UPDATE itsm.asset SET status = $2 WHERE id = $1`, out.AssetID, nextAssetStatus)
		}
		return nil
	})
	return out, err
}

func (s *Store) ListStaffRef(ctx context.Context, status string) ([]StaffRef, error) {
	q := `SELECT employee_id, user_id, employee_number, name_en, name_ar, email, department_id, status, updated_at FROM itsm.staff_ref`
	var args []any
	if status != "" {
		q += ` WHERE status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY name_en ASC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]StaffRef, 0)
	for rows.Next() {
		var r StaffRef
		if err := rows.Scan(&r.EmployeeID, &r.UserID, &r.EmployeeNumber, &r.NameEn, &r.NameAr, &r.Email, &r.DepartmentID, &r.Status, &r.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) SyncHREmployee(ctx context.Context, consumer, eventID string, r StaffRef) error {
	if s.pool == nil || r.EmployeeID == "" {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		if r.Status == "" {
			r.Status = "active"
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO itsm.staff_ref (employee_id, user_id, employee_number, name_en, name_ar, email, department_id, status, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
			ON CONFLICT (employee_id) DO UPDATE SET
				user_id = COALESCE(EXCLUDED.user_id, itsm.staff_ref.user_id),
				employee_number = CASE WHEN EXCLUDED.employee_number <> '' THEN EXCLUDED.employee_number ELSE itsm.staff_ref.employee_number END,
				name_en = CASE WHEN EXCLUDED.name_en <> '' THEN EXCLUDED.name_en ELSE itsm.staff_ref.name_en END,
				name_ar = CASE WHEN EXCLUDED.name_ar <> '' THEN EXCLUDED.name_ar ELSE itsm.staff_ref.name_ar END,
				email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE itsm.staff_ref.email END,
				department_id = COALESCE(EXCLUDED.department_id, itsm.staff_ref.department_id),
				status = EXCLUDED.status,
				updated_at = now()`,
			r.EmployeeID, r.UserID, r.EmployeeNumber, r.NameEn, r.NameAr, r.Email, r.DepartmentID, r.Status,
		)
		return err
	})
}
