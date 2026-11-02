-- name: ListCustomers :many
SELECT * FROM commerce.customer ORDER BY created_at DESC;

-- name: GetCustomerByID :one
SELECT * FROM commerce.customer WHERE id = $1 LIMIT 1;

-- name: GetCustomerByEmail :one
SELECT * FROM commerce.customer WHERE email = $1 LIMIT 1;

-- name: CreateCustomer :one
INSERT INTO commerce.customer (
    id, email, phone, first_name, last_name, status, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING *;

-- name: UpdateCustomer :one
UPDATE commerce.customer SET
    email = $2,
    phone = $3,
    first_name = $4,
    last_name = $5,
    status = $6,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListCustomerAddresses :many
SELECT * FROM commerce.customer_address WHERE customer_id = $1 ORDER BY is_default DESC, id ASC;

-- name: CreateCustomerAddress :one
INSERT INTO commerce.customer_address (
    id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING *;

-- name: GetStoreSettings :one
SELECT * FROM commerce.store_settings WHERE id = 'default' LIMIT 1;

-- name: UpsertStoreSettings :one
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
RETURNING *;

-- name: ListCoupons :many
SELECT * FROM commerce.coupon ORDER BY created_at DESC;

-- name: GetCouponByCode :one
SELECT * FROM commerce.coupon WHERE code = $1 LIMIT 1;

-- name: CreateCoupon :one
INSERT INTO commerce.coupon (
    id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, expires_at, usage_limit, usage_count, is_active, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now()
) RETURNING *;

-- name: ListOrders :many
SELECT * FROM commerce.sales_order ORDER BY placed_at DESC;

-- name: GetOrderByID :one
SELECT * FROM commerce.sales_order WHERE id = $1 LIMIT 1;

-- name: GetOrderByNumber :one
SELECT * FROM commerce.sales_order WHERE number = $1 LIMIT 1;

-- name: ListOrdersByCustomer :many
SELECT * FROM commerce.sales_order WHERE customer_id = $1 ORDER BY placed_at DESC;

-- name: CreateOrder :one
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
) RETURNING *;

-- name: UpdateOrderStatus :one
UPDATE commerce.sales_order SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateOrderPaymentStatus :one
UPDATE commerce.sales_order SET
    payment_status = $2,
    amount_paid = $3,
    paid_at = $4,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListOrderLines :many
SELECT * FROM commerce.sales_order_line WHERE order_id = $1 ORDER BY sort_order ASC, id ASC;

-- name: CreateOrderLine :one
INSERT INTO commerce.sales_order_line (
    id, order_id, product_id, variant_key, sku, description, quantity, unit_price, vat_exempt, line_total, location_id, returned_quantity, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: ListOrderEvents :many
SELECT * FROM commerce.sales_order_event WHERE order_id = $1 ORDER BY created_at ASC;

-- name: CreateOrderEvent :one
INSERT INTO commerce.sales_order_event (
    id, order_id, kind, status, note, amount, by_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING *;

-- name: ListRetailRegisters :many
SELECT * FROM commerce.retail_register ORDER BY name ASC;

-- name: CreateRetailRegister :one
INSERT INTO commerce.retail_register (
    id, name, branch_id, is_active
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: ListRetailShifts :many
SELECT * FROM commerce.retail_shift ORDER BY opened_at DESC;

-- name: CreateRetailShift :one
INSERT INTO commerce.retail_shift (
    id, register_id, cashier_id, opened_at, starting_cash, closing_cash, expected_cash, status
) VALUES (
    $1, $2, $3, now(), $4, $5, $6, $7
) RETURNING *;

-- name: CloseRetailShift :one
UPDATE commerce.retail_shift SET
    closed_at = now(),
    closing_cash = $2,
    expected_cash = $3,
    status = 'closed'
WHERE id = $1
RETURNING *;