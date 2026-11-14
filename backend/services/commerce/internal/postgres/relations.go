package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
)

type WarehouseRef struct {
	WarehouseID string    `json:"warehouseId"`
	Code        string    `json:"code"`
	NameEn      string    `json:"nameEn"`
	NameAr      string    `json:"nameAr"`
	IsActive    bool      `json:"isActive"`
	IsDefault   bool      `json:"isDefault"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type OrderRelations struct {
	OrderID        string  `json:"orderId"`
	Number         string  `json:"number"`
	CustomerID     *string `json:"customerId,omitempty"`
	ContactID      *string `json:"contactId,omitempty"`
	WarehouseID    *string `json:"warehouseId,omitempty"`
	WarehouseName  string  `json:"warehouseName,omitempty"`
	InvoiceID      *string `json:"invoiceId,omitempty"`
	ShipmentID     *string `json:"shipmentId,omitempty"`
	ShipmentStatus *string `json:"shipmentStatus,omitempty"`
	TrackingToken  *string `json:"trackingToken,omitempty"`
	Status         string  `json:"status"`
	PaymentStatus  string  `json:"paymentStatus"`
}

func (s *Store) ListOrdersFiltered(ctx context.Context, customerID, contactID, status string) ([]SalesOrder, error) {
	if customerID == "" && contactID == "" && status == "" {
		return s.ListOrders(ctx)
	}
	if customerID != "" && contactID == "" && status == "" {
		return s.ListOrdersByCustomer(ctx, &customerID)
	}
	q := `SELECT id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method,
	             fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total,
	             amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id,
	             placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at
	      FROM commerce.sales_order WHERE 1=1`
	var args []any
	idx := 1
	if customerID != "" {
		q += fmt.Sprintf(" AND customer_id = $%d", idx)
		args = append(args, customerID)
		idx++
	}
	if contactID != "" {
		q += fmt.Sprintf(" AND contact_id = $%d", idx)
		args = append(args, contactID)
		idx++
	}
	if status != "" {
		q += fmt.Sprintf(" AND status = $%d", idx)
		args = append(args, status)
		idx++
	}
	q += ` ORDER BY placed_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]SalesOrder, 0)
	for rows.Next() {
		var o SalesOrder
		if err := rows.Scan(
			&o.ID, &o.Number, &o.CustomerID, &o.ContactID, &o.Email, &o.Name, &o.Phone, &o.Channel, &o.Status,
			&o.PaymentStatus, &o.PaymentMethod, &o.Fulfilment, &o.ShippingAddress, &o.Subtotal, &o.DiscountAmount,
			&o.CouponCode, &o.VatAmount, &o.DeliveryFee, &o.Total, &o.AmountPaid, &o.AmountRefunded, &o.Currency,
			&o.Locale, &o.Note, &o.WarehouseID, &o.InvoiceID, &o.CreatedByID, &o.PlacedAt, &o.PaidAt, &o.ShippedAt,
			&o.DeliveredAt, &o.CancelledAt, &o.UtmCampaign, &o.UtmSource, &o.UtmMedium, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Store) GetOrderRelations(ctx context.Context, orderID string) (OrderRelations, error) {
	var out OrderRelations
	err := s.pool.QueryRow(ctx, `
		SELECT o.id, o.number, o.customer_id, o.contact_id, o.warehouse_id, COALESCE(w.name_en, ''),
		       o.invoice_id, o.shipment_id, o.shipment_status, o.tracking_token, o.status, o.payment_status
		FROM commerce.sales_order o
		LEFT JOIN commerce.warehouse_ref w ON w.warehouse_id = o.warehouse_id
		WHERE o.id = $1`, orderID,
	).Scan(
		&out.OrderID, &out.Number, &out.CustomerID, &out.ContactID, &out.WarehouseID, &out.WarehouseName,
		&out.InvoiceID, &out.ShipmentID, &out.ShipmentStatus, &out.TrackingToken, &out.Status, &out.PaymentStatus,
	)
	return out, err
}

func (s *Store) ListWarehouseRefs(ctx context.Context) ([]WarehouseRef, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT warehouse_id, code, name_en, name_ar, is_active, is_default, updated_at
		FROM commerce.warehouse_ref ORDER BY is_default DESC, name_en ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]WarehouseRef, 0)
	for rows.Next() {
		var w WarehouseRef
		if err := rows.Scan(&w.WarehouseID, &w.Code, &w.NameEn, &w.NameAr, &w.IsActive, &w.IsDefault, &w.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (s *Store) ApplyShipmentSync(ctx context.Context, consumer, eventID, orderID, shipmentID, status, trackingToken string) error {
	if s.pool == nil || (orderID == "" && shipmentID == "") {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		if orderID != "" {
			_, err = tx.Exec(ctx, `
				UPDATE commerce.sales_order
				SET shipment_id = COALESCE(NULLIF($2, ''), shipment_id),
				    shipment_status = CASE WHEN $3 <> '' THEN $3 ELSE shipment_status END,
				    tracking_token = COALESCE(NULLIF($4, ''), tracking_token),
				    status = CASE
				        WHEN $3 = 'delivered' THEN 'delivered'
				        WHEN $3 IN ('assigned', 'dispatched', 'out_for_delivery') AND status IN ('placed', 'paid', 'packing') THEN 'shipped'
				        ELSE status
				    END,
				    shipped_at = CASE WHEN $3 IN ('assigned', 'dispatched', 'out_for_delivery') AND shipped_at IS NULL THEN now() ELSE shipped_at END,
				    delivered_at = CASE WHEN $3 = 'delivered' AND delivered_at IS NULL THEN now() ELSE delivered_at END,
				    updated_at = now()
				WHERE id = $1`, orderID, shipmentID, status, trackingToken)
			return err
		}
		_, err = tx.Exec(ctx, `
			UPDATE commerce.sales_order
			SET shipment_status = CASE WHEN $2 <> '' THEN $2 ELSE shipment_status END,
			    tracking_token = COALESCE(NULLIF($3, ''), tracking_token),
			    status = CASE WHEN $2 = 'delivered' THEN 'delivered' ELSE status END,
			    delivered_at = CASE WHEN $2 = 'delivered' AND delivered_at IS NULL THEN now() ELSE delivered_at END,
			    updated_at = now()
			WHERE shipment_id = $1`, shipmentID, status, trackingToken)
		return err
	})
}

func (s *Store) ApplyInvoiceSync(ctx context.Context, consumer, eventID, orderID, invoiceID, status string) error {
	if s.pool == nil || (orderID == "" && invoiceID == "") {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		if orderID != "" {
			_, err = tx.Exec(ctx, `
				UPDATE commerce.sales_order
				SET invoice_id = COALESCE(NULLIF($2, ''), invoice_id),
				    payment_status = CASE WHEN $3 = 'paid' THEN 'paid' ELSE payment_status END,
				    paid_at = CASE WHEN $3 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
				    updated_at = now()
				WHERE id = $1`, orderID, invoiceID, status)
			return err
		}
		if invoiceID != "" && status == "paid" {
			_, err = tx.Exec(ctx, `
				UPDATE commerce.sales_order
				SET payment_status = 'paid',
				    paid_at = COALESCE(paid_at, now()),
				    updated_at = now()
				WHERE invoice_id = $1`, invoiceID)
			return err
		}
		return nil
	})
}

func (s *Store) UpsertWarehouseRef(ctx context.Context, consumer, eventID string, w WarehouseRef) error {
	if s.pool == nil || w.WarehouseID == "" {
		return nil
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, Schema, consumer, eventID)
		if err != nil || !first {
			return err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO commerce.warehouse_ref (warehouse_id, code, name_en, name_ar, is_active, is_default, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,now())
			ON CONFLICT (warehouse_id) DO UPDATE SET
				code = EXCLUDED.code,
				name_en = EXCLUDED.name_en,
				name_ar = EXCLUDED.name_ar,
				is_active = EXCLUDED.is_active,
				is_default = EXCLUDED.is_default,
				updated_at = now()`,
			w.WarehouseID, w.Code, w.NameEn, w.NameAr, w.IsActive, w.IsDefault,
		)
		return err
	})
}
