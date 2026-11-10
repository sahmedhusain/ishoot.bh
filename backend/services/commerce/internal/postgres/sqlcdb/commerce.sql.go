package sqlcdb
import (
	"context"
	"time"
	"github.com/jackc/pgx/v5/pgtype"
)
const closeRetailShift = `-- name: CloseRetailShift :one
UPDATE commerce.retail_shift SET
    closed_at = now(),
    closing_cash = $2,
    expected_cash = $3,
    status = 'closed'
WHERE id = $1
RETURNING id, register_id, cashier_id, opened_at, closed_at, starting_cash, closing_cash, expected_cash, status
`
type CloseRetailShiftParams struct {
	ID		string
	ClosingCash	pgtype.Numeric
	ExpectedCash	pgtype.Numeric
}
func (q *Queries) CloseRetailShift(ctx context.Context, arg CloseRetailShiftParams) (CommerceRetailShift, error) {
	row := q.db.QueryRow(ctx, closeRetailShift, arg.ID, arg.ClosingCash, arg.ExpectedCash)
	var i CommerceRetailShift
	err := row.Scan(
		&i.ID,
		&i.RegisterID,
		&i.CashierID,
		&i.OpenedAt,
		&i.ClosedAt,
		&i.StartingCash,
		&i.ClosingCash,
		&i.ExpectedCash,
		&i.Status,
	)
	return i, err
}
const createCoupon = `-- name: CreateCoupon :one
INSERT INTO commerce.coupon (
    id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, expires_at, usage_limit, usage_count, is_active, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now()
) RETURNING id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, expires_at, usage_limit, usage_count, is_active, created_at
`
type CreateCouponParams struct {
	ID			string
	Code			string
	DiscountType		string
	DiscountValue		pgtype.Numeric
	MinOrderAmount		pgtype.Numeric
	MaxDiscountAmount	pgtype.Numeric
	StartsAt		*time.Time
	ExpiresAt		*time.Time
	UsageLimit		*int32
	UsageCount		int32
	IsActive		bool
}
func (q *Queries) CreateCoupon(ctx context.Context, arg CreateCouponParams) (CommerceCoupon, error) {
	row := q.db.QueryRow(ctx, createCoupon,
		arg.ID,
		arg.Code,
		arg.DiscountType,
		arg.DiscountValue,
		arg.MinOrderAmount,
		arg.MaxDiscountAmount,
		arg.StartsAt,
		arg.ExpiresAt,
		arg.UsageLimit,
		arg.UsageCount,
		arg.IsActive,
	)
	var i CommerceCoupon
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.DiscountType,
		&i.DiscountValue,
		&i.MinOrderAmount,
		&i.MaxDiscountAmount,
		&i.StartsAt,
		&i.ExpiresAt,
		&i.UsageLimit,
		&i.UsageCount,
		&i.IsActive,
		&i.CreatedAt,
	)
	return i, err
}
const createCustomer = `-- name: CreateCustomer :one
INSERT INTO commerce.customer (
    id, email, phone, first_name, last_name, status, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING id, email, phone, first_name, last_name, status, created_at, updated_at
`
type CreateCustomerParams struct {
	ID		string
	Email		*string
	Phone		*string
	FirstName	string
	LastName	string
	Status		string
}
func (q *Queries) CreateCustomer(ctx context.Context, arg CreateCustomerParams) (CommerceCustomer, error) {
	row := q.db.QueryRow(ctx, createCustomer,
		arg.ID,
		arg.Email,
		arg.Phone,
		arg.FirstName,
		arg.LastName,
		arg.Status,
	)
	var i CommerceCustomer
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Phone,
		&i.FirstName,
		&i.LastName,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const createCustomerAddress = `-- name: CreateCustomerAddress :one
INSERT INTO commerce.customer_address (
    id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default
`
type CreateCustomerAddressParams struct {
	ID		string
	CustomerID	string
	AddressType	string
	Label		string
	Line1		string
	Line2		string
	City		string
	State		string
	PostalCode	string
	Country		string
	IsDefault	bool
}
func (q *Queries) CreateCustomerAddress(ctx context.Context, arg CreateCustomerAddressParams) (CommerceCustomerAddress, error) {
	row := q.db.QueryRow(ctx, createCustomerAddress,
		arg.ID,
		arg.CustomerID,
		arg.AddressType,
		arg.Label,
		arg.Line1,
		arg.Line2,
		arg.City,
		arg.State,
		arg.PostalCode,
		arg.Country,
		arg.IsDefault,
	)
	var i CommerceCustomerAddress
	err := row.Scan(
		&i.ID,
		&i.CustomerID,
		&i.AddressType,
		&i.Label,
		&i.Line1,
		&i.Line2,
		&i.City,
		&i.State,
		&i.PostalCode,
		&i.Country,
		&i.IsDefault,
	)
	return i, err
}
const createOrder = `-- name: CreateOrder :one
INSERT INTO commerce.sales_order (
    id, number, customer_id, contact_id, email, name, phone, channel, status,
    payment_status, payment_method, fulfilment, shipping_address, subtotal,
    discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid,
    amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id,
    placed_at, utm_campaign, utm_source, utm_medium, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9,
    $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20,
    $21, $22, $23, $24, $25, $26, $27,
    now(), $28, $29, $30, now()
) RETURNING id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at
`
type CreateOrderParams struct {
	ID		string
	Number		string
	CustomerID	*string
	ContactID	*string
	Email		*string
	Name		string
	Phone		*string
	Channel		string
	Status		string
	PaymentStatus	string
	PaymentMethod	string
	Fulfilment	string
	ShippingAddress	[]byte
	Subtotal	pgtype.Numeric
	DiscountAmount	pgtype.Numeric
	CouponCode	*string
	VatAmount	pgtype.Numeric
	DeliveryFee	pgtype.Numeric
	Total		pgtype.Numeric
	AmountPaid	pgtype.Numeric
	AmountRefunded	pgtype.Numeric
	Currency	string
	Locale		string
	Note		*string
	WarehouseID	*string
	InvoiceID	*string
	CreatedByID	*string
	UtmCampaign	*string
	UtmSource	*string
	UtmMedium	*string
}
func (q *Queries) CreateOrder(ctx context.Context, arg CreateOrderParams) (CommerceSalesOrder, error) {
	row := q.db.QueryRow(ctx, createOrder,
		arg.ID,
		arg.Number,
		arg.CustomerID,
		arg.ContactID,
		arg.Email,
		arg.Name,
		arg.Phone,
		arg.Channel,
		arg.Status,
		arg.PaymentStatus,
		arg.PaymentMethod,
		arg.Fulfilment,
		arg.ShippingAddress,
		arg.Subtotal,
		arg.DiscountAmount,
		arg.CouponCode,
		arg.VatAmount,
		arg.DeliveryFee,
		arg.Total,
		arg.AmountPaid,
		arg.AmountRefunded,
		arg.Currency,
		arg.Locale,
		arg.Note,
		arg.WarehouseID,
		arg.InvoiceID,
		arg.CreatedByID,
		arg.UtmCampaign,
		arg.UtmSource,
		arg.UtmMedium,
	)
	var i CommerceSalesOrder
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.CustomerID,
		&i.ContactID,
		&i.Email,
		&i.Name,
		&i.Phone,
		&i.Channel,
		&i.Status,
		&i.PaymentStatus,
		&i.PaymentMethod,
		&i.Fulfilment,
		&i.ShippingAddress,
		&i.Subtotal,
		&i.DiscountAmount,
		&i.CouponCode,
		&i.VatAmount,
		&i.DeliveryFee,
		&i.Total,
		&i.AmountPaid,
		&i.AmountRefunded,
		&i.Currency,
		&i.Locale,
		&i.Note,
		&i.WarehouseID,
		&i.InvoiceID,
		&i.CreatedByID,
		&i.PlacedAt,
		&i.PaidAt,
		&i.ShippedAt,
		&i.DeliveredAt,
		&i.CancelledAt,
		&i.UtmCampaign,
		&i.UtmSource,
		&i.UtmMedium,
		&i.UpdatedAt,
	)
	return i, err
}
const createOrderEvent = `-- name: CreateOrderEvent :one
INSERT INTO commerce.sales_order_event (
    id, order_id, kind, status, note, amount, by_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING id, order_id, kind, status, note, amount, by_id, created_at
`
type CreateOrderEventParams struct {
	ID	string
	OrderID	string
	Kind	string
	Status	*string
	Note	*string
	Amount	pgtype.Numeric
	ByID	*string
}
func (q *Queries) CreateOrderEvent(ctx context.Context, arg CreateOrderEventParams) (CommerceSalesOrderEvent, error) {
	row := q.db.QueryRow(ctx, createOrderEvent,
		arg.ID,
		arg.OrderID,
		arg.Kind,
		arg.Status,
		arg.Note,
		arg.Amount,
		arg.ByID,
	)
	var i CommerceSalesOrderEvent
	err := row.Scan(
		&i.ID,
		&i.OrderID,
		&i.Kind,
		&i.Status,
		&i.Note,
		&i.Amount,
		&i.ByID,
		&i.CreatedAt,
	)
	return i, err
}
const createOrderLine = `-- name: CreateOrderLine :one
INSERT INTO commerce.sales_order_line (
    id, order_id, product_id, variant_key, sku, description, quantity, unit_price, vat_exempt, line_total, location_id, returned_quantity, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING id, order_id, product_id, variant_key, sku, description, quantity, unit_price, vat_exempt, line_total, location_id, returned_quantity, sort_order
`
type CreateOrderLineParams struct {
	ID			string
	OrderID			string
	ProductID		string
	VariantKey		string
	Sku			string
	Description		string
	Quantity		pgtype.Numeric
	UnitPrice		pgtype.Numeric
	VatExempt		bool
	LineTotal		pgtype.Numeric
	LocationID		*string
	ReturnedQuantity	pgtype.Numeric
	SortOrder		int32
}
func (q *Queries) CreateOrderLine(ctx context.Context, arg CreateOrderLineParams) (CommerceSalesOrderLine, error) {
	row := q.db.QueryRow(ctx, createOrderLine,
		arg.ID,
		arg.OrderID,
		arg.ProductID,
		arg.VariantKey,
		arg.Sku,
		arg.Description,
		arg.Quantity,
		arg.UnitPrice,
		arg.VatExempt,
		arg.LineTotal,
		arg.LocationID,
		arg.ReturnedQuantity,
		arg.SortOrder,
	)
	var i CommerceSalesOrderLine
	err := row.Scan(
		&i.ID,
		&i.OrderID,
		&i.ProductID,
		&i.VariantKey,
		&i.Sku,
		&i.Description,
		&i.Quantity,
		&i.UnitPrice,
		&i.VatExempt,
		&i.LineTotal,
		&i.LocationID,
		&i.ReturnedQuantity,
		&i.SortOrder,
	)
	return i, err
}
const createRetailRegister = `-- name: CreateRetailRegister :one
INSERT INTO commerce.retail_register (
    id, name, branch_id, is_active
) VALUES (
    $1, $2, $3, $4
) RETURNING id, name, branch_id, is_active
`
type CreateRetailRegisterParams struct {
	ID		string
	Name		string
	BranchID	*string
	IsActive	bool
}
func (q *Queries) CreateRetailRegister(ctx context.Context, arg CreateRetailRegisterParams) (CommerceRetailRegister, error) {
	row := q.db.QueryRow(ctx, createRetailRegister,
		arg.ID,
		arg.Name,
		arg.BranchID,
		arg.IsActive,
	)
	var i CommerceRetailRegister
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.BranchID,
		&i.IsActive,
	)
	return i, err
}
const createRetailShift = `-- name: CreateRetailShift :one
INSERT INTO commerce.retail_shift (
    id, register_id, cashier_id, opened_at, starting_cash, closing_cash, expected_cash, status
) VALUES (
    $1, $2, $3, now(), $4, $5, $6, $7
) RETURNING id, register_id, cashier_id, opened_at, closed_at, starting_cash, closing_cash, expected_cash, status
`
type CreateRetailShiftParams struct {
	ID		string
	RegisterID	string
	CashierID	string
	StartingCash	pgtype.Numeric
	ClosingCash	pgtype.Numeric
	ExpectedCash	pgtype.Numeric
	Status		string
}
func (q *Queries) CreateRetailShift(ctx context.Context, arg CreateRetailShiftParams) (CommerceRetailShift, error) {
	row := q.db.QueryRow(ctx, createRetailShift,
		arg.ID,
		arg.RegisterID,
		arg.CashierID,
		arg.StartingCash,
		arg.ClosingCash,
		arg.ExpectedCash,
		arg.Status,
	)
	var i CommerceRetailShift
	err := row.Scan(
		&i.ID,
		&i.RegisterID,
		&i.CashierID,
		&i.OpenedAt,
		&i.ClosedAt,
		&i.StartingCash,
		&i.ClosingCash,
		&i.ExpectedCash,
		&i.Status,
	)
	return i, err
}
const getCouponByCode = `-- name: GetCouponByCode :one
SELECT id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, expires_at, usage_limit, usage_count, is_active, created_at FROM commerce.coupon WHERE code = $1 LIMIT 1
`
func (q *Queries) GetCouponByCode(ctx context.Context, code string) (CommerceCoupon, error) {
	row := q.db.QueryRow(ctx, getCouponByCode, code)
	var i CommerceCoupon
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.DiscountType,
		&i.DiscountValue,
		&i.MinOrderAmount,
		&i.MaxDiscountAmount,
		&i.StartsAt,
		&i.ExpiresAt,
		&i.UsageLimit,
		&i.UsageCount,
		&i.IsActive,
		&i.CreatedAt,
	)
	return i, err
}
const getCustomerByEmail = `-- name: GetCustomerByEmail :one
SELECT id, email, phone, first_name, last_name, status, created_at, updated_at FROM commerce.customer WHERE email = $1 LIMIT 1
`
func (q *Queries) GetCustomerByEmail(ctx context.Context, email *string) (CommerceCustomer, error) {
	row := q.db.QueryRow(ctx, getCustomerByEmail, email)
	var i CommerceCustomer
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Phone,
		&i.FirstName,
		&i.LastName,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getCustomerByID = `-- name: GetCustomerByID :one
SELECT id, email, phone, first_name, last_name, status, created_at, updated_at FROM commerce.customer WHERE id = $1 LIMIT 1
`
func (q *Queries) GetCustomerByID(ctx context.Context, id string) (CommerceCustomer, error) {
	row := q.db.QueryRow(ctx, getCustomerByID, id)
	var i CommerceCustomer
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Phone,
		&i.FirstName,
		&i.LastName,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getOrderByID = `-- name: GetOrderByID :one
SELECT id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at FROM commerce.sales_order WHERE id = $1 LIMIT 1
`
func (q *Queries) GetOrderByID(ctx context.Context, id string) (CommerceSalesOrder, error) {
	row := q.db.QueryRow(ctx, getOrderByID, id)
	var i CommerceSalesOrder
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.CustomerID,
		&i.ContactID,
		&i.Email,
		&i.Name,
		&i.Phone,
		&i.Channel,
		&i.Status,
		&i.PaymentStatus,
		&i.PaymentMethod,
		&i.Fulfilment,
		&i.ShippingAddress,
		&i.Subtotal,
		&i.DiscountAmount,
		&i.CouponCode,
		&i.VatAmount,
		&i.DeliveryFee,
		&i.Total,
		&i.AmountPaid,
		&i.AmountRefunded,
		&i.Currency,
		&i.Locale,
		&i.Note,
		&i.WarehouseID,
		&i.InvoiceID,
		&i.CreatedByID,
		&i.PlacedAt,
		&i.PaidAt,
		&i.ShippedAt,
		&i.DeliveredAt,
		&i.CancelledAt,
		&i.UtmCampaign,
		&i.UtmSource,
		&i.UtmMedium,
		&i.UpdatedAt,
	)
	return i, err
}
const getOrderByNumber = `-- name: GetOrderByNumber :one
SELECT id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at FROM commerce.sales_order WHERE number = $1 LIMIT 1
`
func (q *Queries) GetOrderByNumber(ctx context.Context, number string) (CommerceSalesOrder, error) {
	row := q.db.QueryRow(ctx, getOrderByNumber, number)
	var i CommerceSalesOrder
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.CustomerID,
		&i.ContactID,
		&i.Email,
		&i.Name,
		&i.Phone,
		&i.Channel,
		&i.Status,
		&i.PaymentStatus,
		&i.PaymentMethod,
		&i.Fulfilment,
		&i.ShippingAddress,
		&i.Subtotal,
		&i.DiscountAmount,
		&i.CouponCode,
		&i.VatAmount,
		&i.DeliveryFee,
		&i.Total,
		&i.AmountPaid,
		&i.AmountRefunded,
		&i.Currency,
		&i.Locale,
		&i.Note,
		&i.WarehouseID,
		&i.InvoiceID,
		&i.CreatedByID,
		&i.PlacedAt,
		&i.PaidAt,
		&i.ShippedAt,
		&i.DeliveredAt,
		&i.CancelledAt,
		&i.UtmCampaign,
		&i.UtmSource,
		&i.UtmMedium,
		&i.UpdatedAt,
	)
	return i, err
}
const getStoreSettings = `-- name: GetStoreSettings :one
SELECT id, currency, tax_inclusive, default_tax_rate, minimum_order_amount, free_shipping_threshold FROM commerce.store_settings WHERE id = 'default' LIMIT 1
`
func (q *Queries) GetStoreSettings(ctx context.Context) (CommerceStoreSetting, error) {
	row := q.db.QueryRow(ctx, getStoreSettings)
	var i CommerceStoreSetting
	err := row.Scan(
		&i.ID,
		&i.Currency,
		&i.TaxInclusive,
		&i.DefaultTaxRate,
		&i.MinimumOrderAmount,
		&i.FreeShippingThreshold,
	)
	return i, err
}
const listCoupons = `-- name: ListCoupons :many
SELECT id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, expires_at, usage_limit, usage_count, is_active, created_at FROM commerce.coupon ORDER BY created_at DESC
`
func (q *Queries) ListCoupons(ctx context.Context) ([]CommerceCoupon, error) {
	rows, err := q.db.Query(ctx, listCoupons)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceCoupon
	for rows.Next() {
		var i CommerceCoupon
		if err := rows.Scan(
			&i.ID,
			&i.Code,
			&i.DiscountType,
			&i.DiscountValue,
			&i.MinOrderAmount,
			&i.MaxDiscountAmount,
			&i.StartsAt,
			&i.ExpiresAt,
			&i.UsageLimit,
			&i.UsageCount,
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
const listCustomerAddresses = `-- name: ListCustomerAddresses :many
SELECT id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default FROM commerce.customer_address WHERE customer_id = $1 ORDER BY is_default DESC, id ASC
`
func (q *Queries) ListCustomerAddresses(ctx context.Context, customerID string) ([]CommerceCustomerAddress, error) {
	rows, err := q.db.Query(ctx, listCustomerAddresses, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceCustomerAddress
	for rows.Next() {
		var i CommerceCustomerAddress
		if err := rows.Scan(
			&i.ID,
			&i.CustomerID,
			&i.AddressType,
			&i.Label,
			&i.Line1,
			&i.Line2,
			&i.City,
			&i.State,
			&i.PostalCode,
			&i.Country,
			&i.IsDefault,
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
const listCustomers = `-- name: ListCustomers :many
SELECT id, email, phone, first_name, last_name, status, created_at, updated_at FROM commerce.customer ORDER BY created_at DESC
`
func (q *Queries) ListCustomers(ctx context.Context) ([]CommerceCustomer, error) {
	rows, err := q.db.Query(ctx, listCustomers)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceCustomer
	for rows.Next() {
		var i CommerceCustomer
		if err := rows.Scan(
			&i.ID,
			&i.Email,
			&i.Phone,
			&i.FirstName,
			&i.LastName,
			&i.Status,
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
const listOrderEvents = `-- name: ListOrderEvents :many
SELECT id, order_id, kind, status, note, amount, by_id, created_at FROM commerce.sales_order_event WHERE order_id = $1 ORDER BY created_at ASC
`
func (q *Queries) ListOrderEvents(ctx context.Context, orderID string) ([]CommerceSalesOrderEvent, error) {
	rows, err := q.db.Query(ctx, listOrderEvents, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceSalesOrderEvent
	for rows.Next() {
		var i CommerceSalesOrderEvent
		if err := rows.Scan(
			&i.ID,
			&i.OrderID,
			&i.Kind,
			&i.Status,
			&i.Note,
			&i.Amount,
			&i.ByID,
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
const listOrderLines = `-- name: ListOrderLines :many
SELECT id, order_id, product_id, variant_key, sku, description, quantity, unit_price, vat_exempt, line_total, location_id, returned_quantity, sort_order FROM commerce.sales_order_line WHERE order_id = $1 ORDER BY sort_order ASC, id ASC
`
func (q *Queries) ListOrderLines(ctx context.Context, orderID string) ([]CommerceSalesOrderLine, error) {
	rows, err := q.db.Query(ctx, listOrderLines, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceSalesOrderLine
	for rows.Next() {
		var i CommerceSalesOrderLine
		if err := rows.Scan(
			&i.ID,
			&i.OrderID,
			&i.ProductID,
			&i.VariantKey,
			&i.Sku,
			&i.Description,
			&i.Quantity,
			&i.UnitPrice,
			&i.VatExempt,
			&i.LineTotal,
			&i.LocationID,
			&i.ReturnedQuantity,
			&i.SortOrder,
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
const listOrders = `-- name: ListOrders :many
SELECT id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at FROM commerce.sales_order ORDER BY placed_at DESC
`
func (q *Queries) ListOrders(ctx context.Context) ([]CommerceSalesOrder, error) {
	rows, err := q.db.Query(ctx, listOrders)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceSalesOrder
	for rows.Next() {
		var i CommerceSalesOrder
		if err := rows.Scan(
			&i.ID,
			&i.Number,
			&i.CustomerID,
			&i.ContactID,
			&i.Email,
			&i.Name,
			&i.Phone,
			&i.Channel,
			&i.Status,
			&i.PaymentStatus,
			&i.PaymentMethod,
			&i.Fulfilment,
			&i.ShippingAddress,
			&i.Subtotal,
			&i.DiscountAmount,
			&i.CouponCode,
			&i.VatAmount,
			&i.DeliveryFee,
			&i.Total,
			&i.AmountPaid,
			&i.AmountRefunded,
			&i.Currency,
			&i.Locale,
			&i.Note,
			&i.WarehouseID,
			&i.InvoiceID,
			&i.CreatedByID,
			&i.PlacedAt,
			&i.PaidAt,
			&i.ShippedAt,
			&i.DeliveredAt,
			&i.CancelledAt,
			&i.UtmCampaign,
			&i.UtmSource,
			&i.UtmMedium,
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
const listOrdersByCustomer = `-- name: ListOrdersByCustomer :many
SELECT id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at FROM commerce.sales_order WHERE customer_id = $1 ORDER BY placed_at DESC
`
func (q *Queries) ListOrdersByCustomer(ctx context.Context, customerID *string) ([]CommerceSalesOrder, error) {
	rows, err := q.db.Query(ctx, listOrdersByCustomer, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceSalesOrder
	for rows.Next() {
		var i CommerceSalesOrder
		if err := rows.Scan(
			&i.ID,
			&i.Number,
			&i.CustomerID,
			&i.ContactID,
			&i.Email,
			&i.Name,
			&i.Phone,
			&i.Channel,
			&i.Status,
			&i.PaymentStatus,
			&i.PaymentMethod,
			&i.Fulfilment,
			&i.ShippingAddress,
			&i.Subtotal,
			&i.DiscountAmount,
			&i.CouponCode,
			&i.VatAmount,
			&i.DeliveryFee,
			&i.Total,
			&i.AmountPaid,
			&i.AmountRefunded,
			&i.Currency,
			&i.Locale,
			&i.Note,
			&i.WarehouseID,
			&i.InvoiceID,
			&i.CreatedByID,
			&i.PlacedAt,
			&i.PaidAt,
			&i.ShippedAt,
			&i.DeliveredAt,
			&i.CancelledAt,
			&i.UtmCampaign,
			&i.UtmSource,
			&i.UtmMedium,
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
const listRetailRegisters = `-- name: ListRetailRegisters :many
SELECT id, name, branch_id, is_active FROM commerce.retail_register ORDER BY name ASC
`
func (q *Queries) ListRetailRegisters(ctx context.Context) ([]CommerceRetailRegister, error) {
	rows, err := q.db.Query(ctx, listRetailRegisters)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceRetailRegister
	for rows.Next() {
		var i CommerceRetailRegister
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.BranchID,
			&i.IsActive,
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
const listRetailShifts = `-- name: ListRetailShifts :many
SELECT id, register_id, cashier_id, opened_at, closed_at, starting_cash, closing_cash, expected_cash, status FROM commerce.retail_shift ORDER BY opened_at DESC
`
func (q *Queries) ListRetailShifts(ctx context.Context) ([]CommerceRetailShift, error) {
	rows, err := q.db.Query(ctx, listRetailShifts)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommerceRetailShift
	for rows.Next() {
		var i CommerceRetailShift
		if err := rows.Scan(
			&i.ID,
			&i.RegisterID,
			&i.CashierID,
			&i.OpenedAt,
			&i.ClosedAt,
			&i.StartingCash,
			&i.ClosingCash,
			&i.ExpectedCash,
			&i.Status,
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
const updateCustomer = `-- name: UpdateCustomer :one
UPDATE commerce.customer SET
    email = $2,
    phone = $3,
    first_name = $4,
    last_name = $5,
    status = $6,
    updated_at = now()
WHERE id = $1
RETURNING id, email, phone, first_name, last_name, status, created_at, updated_at
`
type UpdateCustomerParams struct {
	ID		string
	Email		*string
	Phone		*string
	FirstName	string
	LastName	string
	Status		string
}
func (q *Queries) UpdateCustomer(ctx context.Context, arg UpdateCustomerParams) (CommerceCustomer, error) {
	row := q.db.QueryRow(ctx, updateCustomer,
		arg.ID,
		arg.Email,
		arg.Phone,
		arg.FirstName,
		arg.LastName,
		arg.Status,
	)
	var i CommerceCustomer
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Phone,
		&i.FirstName,
		&i.LastName,
		&i.Status,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const updateOrderPaymentStatus = `-- name: UpdateOrderPaymentStatus :one
UPDATE commerce.sales_order SET
    payment_status = $2,
    amount_paid = $3,
    paid_at = $4,
    updated_at = now()
WHERE id = $1
RETURNING id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at
`
type UpdateOrderPaymentStatusParams struct {
	ID		string
	PaymentStatus	string
	AmountPaid	pgtype.Numeric
	PaidAt		*time.Time
}
func (q *Queries) UpdateOrderPaymentStatus(ctx context.Context, arg UpdateOrderPaymentStatusParams) (CommerceSalesOrder, error) {
	row := q.db.QueryRow(ctx, updateOrderPaymentStatus,
		arg.ID,
		arg.PaymentStatus,
		arg.AmountPaid,
		arg.PaidAt,
	)
	var i CommerceSalesOrder
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.CustomerID,
		&i.ContactID,
		&i.Email,
		&i.Name,
		&i.Phone,
		&i.Channel,
		&i.Status,
		&i.PaymentStatus,
		&i.PaymentMethod,
		&i.Fulfilment,
		&i.ShippingAddress,
		&i.Subtotal,
		&i.DiscountAmount,
		&i.CouponCode,
		&i.VatAmount,
		&i.DeliveryFee,
		&i.Total,
		&i.AmountPaid,
		&i.AmountRefunded,
		&i.Currency,
		&i.Locale,
		&i.Note,
		&i.WarehouseID,
		&i.InvoiceID,
		&i.CreatedByID,
		&i.PlacedAt,
		&i.PaidAt,
		&i.ShippedAt,
		&i.DeliveredAt,
		&i.CancelledAt,
		&i.UtmCampaign,
		&i.UtmSource,
		&i.UtmMedium,
		&i.UpdatedAt,
	)
	return i, err
}
const updateOrderStatus = `-- name: UpdateOrderStatus :one
UPDATE commerce.sales_order SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at
`
type UpdateOrderStatusParams struct {
	ID	string
	Status	string
}
func (q *Queries) UpdateOrderStatus(ctx context.Context, arg UpdateOrderStatusParams) (CommerceSalesOrder, error) {
	row := q.db.QueryRow(ctx, updateOrderStatus, arg.ID, arg.Status)
	var i CommerceSalesOrder
	err := row.Scan(
		&i.ID,
		&i.Number,
		&i.CustomerID,
		&i.ContactID,
		&i.Email,
		&i.Name,
		&i.Phone,
		&i.Channel,
		&i.Status,
		&i.PaymentStatus,
		&i.PaymentMethod,
		&i.Fulfilment,
		&i.ShippingAddress,
		&i.Subtotal,
		&i.DiscountAmount,
		&i.CouponCode,
		&i.VatAmount,
		&i.DeliveryFee,
		&i.Total,
		&i.AmountPaid,
		&i.AmountRefunded,
		&i.Currency,
		&i.Locale,
		&i.Note,
		&i.WarehouseID,
		&i.InvoiceID,
		&i.CreatedByID,
		&i.PlacedAt,
		&i.PaidAt,
		&i.ShippedAt,
		&i.DeliveredAt,
		&i.CancelledAt,
		&i.UtmCampaign,
		&i.UtmSource,
		&i.UtmMedium,
		&i.UpdatedAt,
	)
	return i, err
}
const upsertStoreSettings = `-- name: UpsertStoreSettings :one
INSERT INTO commerce.store_settings (
    id, currency, tax_inclusive, default_tax_rate, minimum_order_amount, free_shipping_threshold
) VALUES (
    'default', $1, $2, $3, $4, $5
)
ON CONFLICT (id) DO UPDATE SET
    currency = EXCLUDED.currency,
    tax_inclusive = EXCLUDED.tax_inclusive,
    default_tax_rate = EXCLUDED.default_tax_rate,
    minimum_order_amount = EXCLUDED.minimum_order_amount,
    free_shipping_threshold = EXCLUDED.free_shipping_threshold
RETURNING id, currency, tax_inclusive, default_tax_rate, minimum_order_amount, free_shipping_threshold
`
type UpsertStoreSettingsParams struct {
	Currency		string
	TaxInclusive		bool
	DefaultTaxRate		pgtype.Numeric
	MinimumOrderAmount	pgtype.Numeric
	FreeShippingThreshold	pgtype.Numeric
}
func (q *Queries) UpsertStoreSettings(ctx context.Context, arg UpsertStoreSettingsParams) (CommerceStoreSetting, error) {
	row := q.db.QueryRow(ctx, upsertStoreSettings,
		arg.Currency,
		arg.TaxInclusive,
		arg.DefaultTaxRate,
		arg.MinimumOrderAmount,
		arg.FreeShippingThreshold,
	)
	var i CommerceStoreSetting
	err := row.Scan(
		&i.ID,
		&i.Currency,
		&i.TaxInclusive,
		&i.DefaultTaxRate,
		&i.MinimumOrderAmount,
		&i.FreeShippingThreshold,
	)
	return i, err
}
