-- +goose Up
CREATE TABLE IF NOT EXISTS commerce.customer (
    id text PRIMARY KEY,
    email text UNIQUE,
    phone text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce.customer_address (
    id text PRIMARY KEY,
    customer_id text NOT NULL REFERENCES commerce.customer(id) ON DELETE CASCADE,
    address_type text NOT NULL DEFAULT 'shipping',
    label text NOT NULL DEFAULT '',
    line1 text NOT NULL,
    line2 text NOT NULL DEFAULT '',
    city text NOT NULL,
    state text NOT NULL DEFAULT '',
    postal_code text NOT NULL DEFAULT '',
    country text NOT NULL DEFAULT 'BH',
    is_default boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS cust_addr_cust_idx ON commerce.customer_address (customer_id);

CREATE TABLE IF NOT EXISTS commerce.store_settings (
    id text PRIMARY KEY DEFAULT 'default',
    currency text NOT NULL DEFAULT 'BHD',
    tax_inclusive boolean NOT NULL DEFAULT true,
    default_tax_rate numeric(5, 2) NOT NULL DEFAULT 10.00,
    minimum_order_amount numeric(14, 3) NOT NULL DEFAULT 0.000,
    free_shipping_threshold numeric(14, 3) NOT NULL DEFAULT 0.000
);

CREATE TABLE IF NOT EXISTS commerce.coupon (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL, -- percentage | fixed
    discount_value numeric(14, 3) NOT NULL,
    min_order_amount numeric(14, 3) NOT NULL DEFAULT 0.000,
    max_discount_amount numeric(14, 3),
    starts_at timestamptz,
    expires_at timestamptz,
    usage_limit integer,
    usage_count integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce.sales_order (
    id text PRIMARY KEY,
    number text NOT NULL UNIQUE,
    customer_id text REFERENCES commerce.customer(id) ON DELETE SET NULL,
    contact_id text,
    email text,
    name text NOT NULL,
    phone text,
    channel text NOT NULL DEFAULT 'website', -- website | phone | whatsapp | pos
    status text NOT NULL DEFAULT 'placed', -- placed | paid | packing | shipped | delivered | cancelled | returned
    payment_status text NOT NULL DEFAULT 'unpaid', -- unpaid | pending | paid | partially_refunded | refunded
    payment_method text NOT NULL DEFAULT 'online', -- cod | bank_transfer | pay_later | cash | card | online
    fulfilment text NOT NULL DEFAULT 'delivery', -- delivery | pickup
    shipping_address jsonb,
    subtotal numeric(15, 6) NOT NULL DEFAULT 0.000000,
    discount_amount numeric(15, 6) NOT NULL DEFAULT 0.000000,
    coupon_code text,
    vat_amount numeric(15, 6) NOT NULL DEFAULT 0.000000,
    delivery_fee numeric(15, 6) NOT NULL DEFAULT 0.000000,
    total numeric(15, 6) NOT NULL DEFAULT 0.000000,
    amount_paid numeric(15, 6) NOT NULL DEFAULT 0.000000,
    amount_refunded numeric(15, 6) NOT NULL DEFAULT 0.000000,
    currency text NOT NULL DEFAULT 'BHD',
    locale text NOT NULL DEFAULT 'ar',
    note text,
    warehouse_id text,
    invoice_id text UNIQUE,
    created_by_id text,
    placed_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz,
    shipped_at timestamptz,
    delivered_at timestamptz,
    cancelled_at timestamptz,
    utm_campaign text,
    utm_source text,
    utm_medium text,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_order_status_idx ON commerce.sales_order (status);
CREATE INDEX IF NOT EXISTS sales_order_customer_idx ON commerce.sales_order (customer_id);
CREATE INDEX IF NOT EXISTS sales_order_placed_idx ON commerce.sales_order (placed_at);

CREATE TABLE IF NOT EXISTS commerce.sales_order_line (
    id text PRIMARY KEY,
    order_id text NOT NULL REFERENCES commerce.sales_order(id) ON DELETE CASCADE,
    product_id text NOT NULL,
    variant_key text NOT NULL DEFAULT '',
    sku text NOT NULL,
    description text NOT NULL,
    quantity numeric(17, 6) NOT NULL,
    unit_price numeric(15, 6) NOT NULL,
    vat_exempt boolean NOT NULL DEFAULT false,
    line_total numeric(15, 6) NOT NULL,
    location_id text,
    returned_quantity numeric(17, 6) NOT NULL DEFAULT 0.000000,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS order_line_order_idx ON commerce.sales_order_line (order_id);

CREATE TABLE IF NOT EXISTS commerce.sales_order_event (
    id text PRIMARY KEY,
    order_id text NOT NULL REFERENCES commerce.sales_order(id) ON DELETE CASCADE,
    kind text NOT NULL, -- status | payment | refund | note | email
    status text,
    note text,
    amount numeric(15, 6),
    by_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_event_order_idx ON commerce.sales_order_event (order_id, created_at);

CREATE TABLE IF NOT EXISTS commerce.retail_register (
    id text PRIMARY KEY,
    name text NOT NULL,
    branch_id text,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS commerce.retail_shift (
    id text PRIMARY KEY,
    register_id text NOT NULL REFERENCES commerce.retail_register(id) ON DELETE CASCADE,
    cashier_id text NOT NULL,
    opened_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    starting_cash numeric(14, 3) NOT NULL DEFAULT 0.000,
    closing_cash numeric(14, 3) NOT NULL DEFAULT 0.000,
    expected_cash numeric(14, 3) NOT NULL DEFAULT 0.000,
    status text NOT NULL DEFAULT 'open' -- open | closed
);

CREATE TABLE IF NOT EXISTS commerce.retail_closing (
    id text PRIMARY KEY,
    shift_id text NOT NULL REFERENCES commerce.retail_shift(id) ON DELETE CASCADE,
    closing_date date NOT NULL DEFAULT current_date,
    total_sales numeric(14, 3) NOT NULL DEFAULT 0.000,
    total_cash numeric(14, 3) NOT NULL DEFAULT 0.000,
    total_card numeric(14, 3) NOT NULL DEFAULT 0.000,
    notes text
);

-- +goose Down
DROP TABLE IF EXISTS commerce.retail_closing;
DROP TABLE IF EXISTS commerce.retail_shift;
DROP TABLE IF EXISTS commerce.retail_register;
DROP TABLE IF EXISTS commerce.sales_order_event;
DROP TABLE IF EXISTS commerce.sales_order_line;
DROP TABLE IF EXISTS commerce.sales_order;
DROP TABLE IF EXISTS commerce.coupon;
DROP TABLE IF EXISTS commerce.store_settings;
DROP TABLE IF EXISTS commerce.customer_address;
DROP TABLE IF EXISTS commerce.customer;