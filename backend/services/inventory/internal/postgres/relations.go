package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
)

type PurchaseOrderLine struct {
	ID               string  `json:"id"`
	PurchaseOrderID  string  `json:"purchaseOrderId"`
	ProductID        string  `json:"productId"`
	VariantKey       *string `json:"variantKey,omitempty"`
	Description      string  `json:"description"`
	Quantity         float64 `json:"quantity"`
	UnitPrice        float64 `json:"unitPrice"`
	ReceivedQuantity float64 `json:"receivedQuantity"`
	RejectedQuantity float64 `json:"rejectedQuantity"`
	BilledQuantity   float64 `json:"billedQuantity"`
	SortOrder        int32   `json:"sortOrder"`
}

type PurchaseOrder struct {
	ID            string              `json:"id"`
	Number        string              `json:"number"`
	SupplierID    *string             `json:"supplierId,omitempty"`
	SupplierName  *string             `json:"supplierName,omitempty"`
	DocumentID    *string             `json:"documentId,omitempty"`
	Status        string              `json:"status"`
	OrderDate     *time.Time          `json:"orderDate,omitempty"`
	ExpectedDate  *time.Time          `json:"expectedDate,omitempty"`
	WarehouseID   *string             `json:"warehouseId,omitempty"`
	WarehouseName string              `json:"warehouseName,omitempty"`
	Note          *string             `json:"note,omitempty"`
	Terms         *string             `json:"terms,omitempty"`
	Subtotal      float64             `json:"subtotal"`
	VatAmount     float64             `json:"vatAmount"`
	Total         float64             `json:"total"`
	CreatedAt     time.Time           `json:"createdAt"`
	UpdatedAt     time.Time           `json:"updatedAt"`
	Lines         []PurchaseOrderLine `json:"lines,omitempty"`
}

type ReceivePOLineInput struct {
	OrderLineID      string  `json:"orderLineId"`
	ProductID        string  `json:"productId"`
	Quantity         float64 `json:"quantity"`
	RejectedQuantity float64 `json:"rejectedQuantity"`
	RejectReason     *string `json:"rejectReason,omitempty"`
	BatchNumber      *string `json:"batchNumber,omitempty"`
}

type ReceivePOInput struct {
	LocationID   *string              `json:"locationId,omitempty"`
	ReceivedByID *string              `json:"receivedById,omitempty"`
	Note         *string              `json:"note,omitempty"`
	Lines        []ReceivePOLineInput `json:"lines"`
}

type GoodsReceipt struct {
	ID              string    `json:"id"`
	Number          string    `json:"number"`
	PurchaseOrderID string    `json:"purchaseOrderId"`
	LocationID      *string   `json:"locationId,omitempty"`
	ReceivedByID    *string   `json:"receivedById,omitempty"`
	ReceivedAt      time.Time `json:"receivedAt"`
	Note            *string   `json:"note,omitempty"`
}

func (s *Store) ListPurchaseOrders(ctx context.Context, status, supplierID, warehouseID string) ([]PurchaseOrder, error) {
	q := `SELECT po.id, COALESCE(po.number,''), po.supplier_id, po.supplier_name, po.document_id,
	             COALESCE(po.status,'draft'), po.order_date, po.expected_date, po.warehouse_id,
	             COALESCE(w.name_en,''), po.note, po.terms,
	             COALESCE(po.subtotal::float8, 0), COALESCE(po.vat_amount::float8, 0), COALESCE(po.total::float8, 0),
	             po.created_at, po.updated_at
	      FROM inventory.purchase_order po
	      LEFT JOIN inventory.warehouse w ON w.id = po.warehouse_id
	      WHERE 1=1`
	var args []any
	idx := 1
	if status != "" {
		q += fmt.Sprintf(" AND po.status = $%d", idx)
		args = append(args, status)
		idx++
	}
	if supplierID != "" {
		q += fmt.Sprintf(" AND po.supplier_id = $%d", idx)
		args = append(args, supplierID)
		idx++
	}
	if warehouseID != "" {
		q += fmt.Sprintf(" AND po.warehouse_id = $%d", idx)
		args = append(args, warehouseID)
		idx++
	}
	q += ` ORDER BY po.created_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]PurchaseOrder, 0)
	for rows.Next() {
		var po PurchaseOrder
		if err := rows.Scan(
			&po.ID, &po.Number, &po.SupplierID, &po.SupplierName, &po.DocumentID,
			&po.Status, &po.OrderDate, &po.ExpectedDate, &po.WarehouseID,
			&po.WarehouseName, &po.Note, &po.Terms,
			&po.Subtotal, &po.VatAmount, &po.Total, &po.CreatedAt, &po.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, po)
	}
	return out, rows.Err()
}

func (s *Store) GetPurchaseOrderByID(ctx context.Context, id string) (PurchaseOrder, error) {
	var po PurchaseOrder
	err := s.pool.QueryRow(ctx, `
		SELECT po.id, COALESCE(po.number,''), po.supplier_id, po.supplier_name, po.document_id,
		       COALESCE(po.status,'draft'), po.order_date, po.expected_date, po.warehouse_id,
		       COALESCE(w.name_en,''), po.note, po.terms,
		       COALESCE(po.subtotal::float8, 0), COALESCE(po.vat_amount::float8, 0), COALESCE(po.total::float8, 0),
		       po.created_at, po.updated_at
		FROM inventory.purchase_order po
		LEFT JOIN inventory.warehouse w ON w.id = po.warehouse_id
		WHERE po.id = $1`, id,
	).Scan(
		&po.ID, &po.Number, &po.SupplierID, &po.SupplierName, &po.DocumentID,
		&po.Status, &po.OrderDate, &po.ExpectedDate, &po.WarehouseID,
		&po.WarehouseName, &po.Note, &po.Terms,
		&po.Subtotal, &po.VatAmount, &po.Total, &po.CreatedAt, &po.UpdatedAt,
	)
	if err != nil {
		return PurchaseOrder{}, err
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, COALESCE(purchase_order_id,''), COALESCE(product_id,''), variant_key, COALESCE(description,''),
		       COALESCE(quantity::float8, 0), COALESCE(unit_price::float8, 0),
		       COALESCE(received_quantity::float8, 0), COALESCE(rejected_quantity::float8, 0),
		       COALESCE(billed_quantity::float8, 0), COALESCE(sort_order, 0)
		FROM inventory.purchase_order_line
		WHERE purchase_order_id = $1
		ORDER BY sort_order ASC, id ASC`, id)
	if err != nil {
		return PurchaseOrder{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var l PurchaseOrderLine
		if err := rows.Scan(
			&l.ID, &l.PurchaseOrderID, &l.ProductID, &l.VariantKey, &l.Description,
			&l.Quantity, &l.UnitPrice, &l.ReceivedQuantity, &l.RejectedQuantity,
			&l.BilledQuantity, &l.SortOrder,
		); err != nil {
			return PurchaseOrder{}, err
		}
		po.Lines = append(po.Lines, l)
	}
	return po, rows.Err()
}

func (s *Store) CreatePurchaseOrder(ctx context.Context, in PurchaseOrder) (PurchaseOrder, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Number == "" {
		in.Number = "PO-" + strings.ToUpper(in.ID[:8])
	}
	if in.Status == "" {
		in.Status = "draft"
	}
	var subtotal float64
	for _, l := range in.Lines {
		subtotal += l.Quantity * l.UnitPrice
	}
	if in.Subtotal == 0 {
		in.Subtotal = subtotal
	}
	if in.Total == 0 {
		in.Total = in.Subtotal + in.VatAmount
	}
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `
			INSERT INTO inventory.purchase_order (
				id, number, supplier_id, supplier_name, document_id, status, order_date, expected_date,
				warehouse_id, note, terms, subtotal, vat_amount, total, created_at, updated_at
			) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, now()),$8,$9,$10,$11,$12,$13,$14,now(),now())`,
			in.ID, in.Number, in.SupplierID, in.SupplierName, in.DocumentID, in.Status, in.OrderDate, in.ExpectedDate,
			in.WarehouseID, in.Note, in.Terms, in.Subtotal, in.VatAmount, in.Total,
		)
		if err != nil {
			return err
		}
		for i, l := range in.Lines {
			if l.ID == "" {
				l.ID = uuid.NewString()
			}
			_, err := tx.Exec(ctx, `
				INSERT INTO inventory.purchase_order_line (
					id, purchase_order_id, product_id, variant_key, description,
					quantity, unit_price, received_quantity, rejected_quantity, billed_quantity, sort_order
				) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,0,$8)`,
				l.ID, in.ID, l.ProductID, l.VariantKey, l.Description, l.Quantity, l.UnitPrice, i,
			)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return PurchaseOrder{}, err
	}
	return s.GetPurchaseOrderByID(ctx, in.ID)
}

func (s *Store) ReceivePurchaseOrder(ctx context.Context, poID string, in ReceivePOInput, eventSubject string) (GoodsReceipt, error) {
	grID := uuid.NewString()
	grNum := "GR-" + strings.ToUpper(grID[:8])
	var receipt GoodsReceipt
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		var poNumber string
		err := tx.QueryRow(ctx, `SELECT number FROM inventory.purchase_order WHERE id = $1`, poID).Scan(&poNumber)
		if err != nil {
			return err
		}
		err = tx.QueryRow(ctx, `
			INSERT INTO inventory.goods_receipt (id, number, purchase_order_id, location_id, received_by_id, received_at, note, created_at)
			VALUES ($1,$2,$3,$4,$5,now(),$6,now())
			RETURNING id, number, purchase_order_id, location_id, received_by_id, received_at, note`,
			grID, grNum, poID, in.LocationID, in.ReceivedByID, in.Note,
		).Scan(&receipt.ID, &receipt.Number, &receipt.PurchaseOrderID, &receipt.LocationID, &receipt.ReceivedByID, &receipt.ReceivedAt, &receipt.Note)
		if err != nil {
			return err
		}
		for _, line := range in.Lines {
			lineID := uuid.NewString()
			_, err := tx.Exec(ctx, `
				INSERT INTO inventory.goods_receipt_line (id, receipt_id, order_line_id, quantity, rejected_quantity, reject_reason, batch_number)
				VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				lineID, grID, line.OrderLineID, line.Quantity, line.RejectedQuantity, line.RejectReason, line.BatchNumber,
			)
			if err != nil {
				return err
			}
			if line.OrderLineID != "" {
				_, err = tx.Exec(ctx, `
					UPDATE inventory.purchase_order_line
					SET received_quantity = COALESCE(received_quantity, 0) + $2,
					    rejected_quantity = COALESCE(rejected_quantity, 0) + $3
					WHERE id = $1`,
					line.OrderLineID, line.Quantity, line.RejectedQuantity,
				)
				if err != nil {
					return err
				}
			}
			if in.LocationID != nil && *in.LocationID != "" && line.ProductID != "" && line.Quantity > 0 {
				moveID := uuid.NewString()
				_, _ = tx.Exec(ctx, `
					INSERT INTO inventory.stock_movement (id, movement_type, product_id, location_id, quantity, reason, note, created_at)
					VALUES ($1, 'receive', $2, $3, $4, 'purchase_order', $5, now())`,
					moveID, line.ProductID, *in.LocationID, line.Quantity, poNumber,
				)
				_, _ = tx.Exec(ctx, `
					INSERT INTO inventory.stock_level (id, product_id, variant_id, location_id, quantity_on_hand, quantity_reserved, updated_at)
					VALUES ($1, $2, NULL, $3, $4, 0, now())
					ON CONFLICT (product_id, COALESCE(variant_id, ''), location_id) DO UPDATE SET
						quantity_on_hand = inventory.stock_level.quantity_on_hand + EXCLUDED.quantity_on_hand,
						updated_at = now()`,
					uuid.NewString(), line.ProductID, *in.LocationID, line.Quantity,
				)
			}
		}
		_, err = tx.Exec(ctx, `
			UPDATE inventory.purchase_order
			SET status = CASE WHEN EXISTS (
				SELECT 1 FROM inventory.purchase_order_line
				WHERE purchase_order_id = $1 AND COALESCE(received_quantity,0) < COALESCE(quantity,0)
			) THEN 'partial' ELSE 'received' END,
			updated_at = now()
			WHERE id = $1`, poID)
		if err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, Schema, outbox.Event{
			Subject: eventSubject,
			Payload: map[string]any{
				"purchaseOrderId": poID,
				"poNumber":        poNumber,
				"receiptId":       grID,
				"receiptNumber":   grNum,
				"locationId":      in.LocationID,
				"lines":           in.Lines,
			},
		})
	})
	return receipt, err
}
