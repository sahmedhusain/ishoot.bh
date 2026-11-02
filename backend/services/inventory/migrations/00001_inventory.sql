-- +goose Up
CREATE TABLE IF NOT EXISTS inventory.warehouse (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    address text,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    branch_id text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.stock_location (
    id text PRIMARY KEY,
    warehouse_id text NOT NULL REFERENCES inventory.warehouse(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT stock_location_wh_code_uniq UNIQUE (warehouse_id, code)
);

CREATE TABLE IF NOT EXISTS inventory.product_category (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description_en text NOT NULL DEFAULT '',
    description_ar text NOT NULL DEFAULT '',
    parent_id text REFERENCES inventory.product_category(id) ON DELETE SET NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS inventory.product (
    id text PRIMARY KEY,
    sku text NOT NULL UNIQUE,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description_en text NOT NULL DEFAULT '',
    description_ar text NOT NULL DEFAULT '',
    category_id text REFERENCES inventory.product_category(id) ON DELETE SET NULL,
    cost_price numeric(14, 4) NOT NULL DEFAULT 0.0000,
    selling_price numeric(14, 4) NOT NULL DEFAULT 0.0000,
    currency text NOT NULL DEFAULT 'BHD',
    tax_rate numeric(5, 2) NOT NULL DEFAULT 0.00,
    barcode text,
    is_active boolean NOT NULL DEFAULT true,
    track_inventory boolean NOT NULL DEFAULT true,
    reorder_point numeric(14, 2) NOT NULL DEFAULT 0.00,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_category_idx ON inventory.product (category_id, is_active);

CREATE TABLE IF NOT EXISTS inventory.product_variant (
    id text PRIMARY KEY,
    product_id text NOT NULL REFERENCES inventory.product(id) ON DELETE CASCADE,
    sku text NOT NULL UNIQUE,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    barcode text,
    cost_price numeric(14, 4) NOT NULL DEFAULT 0.0000,
    selling_price numeric(14, 4) NOT NULL DEFAULT 0.0000,
    is_active boolean NOT NULL DEFAULT true,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS variant_product_idx ON inventory.product_variant (product_id);

CREATE TABLE IF NOT EXISTS inventory.stock_level (
    id text PRIMARY KEY,
    product_id text NOT NULL REFERENCES inventory.product(id) ON DELETE CASCADE,
    variant_id text REFERENCES inventory.product_variant(id) ON DELETE CASCADE,
    location_id text NOT NULL REFERENCES inventory.stock_location(id) ON DELETE CASCADE,
    quantity_on_hand numeric(14, 4) NOT NULL DEFAULT 0.0000,
    quantity_reserved numeric(14, 4) NOT NULL DEFAULT 0.0000,
    quantity_available numeric(14, 4) NOT NULL DEFAULT 0.0000,
    reorder_point numeric(14, 4) NOT NULL DEFAULT 0.0000,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_level_item_loc_idx ON inventory.stock_level (product_id, COALESCE(variant_id, ''), location_id);

CREATE TABLE IF NOT EXISTS inventory.stock_batch (
    id text PRIMARY KEY,
    batch_number text NOT NULL,
    product_id text NOT NULL REFERENCES inventory.product(id) ON DELETE CASCADE,
    variant_id text REFERENCES inventory.product_variant(id) ON DELETE CASCADE,
    location_id text NOT NULL REFERENCES inventory.stock_location(id) ON DELETE CASCADE,
    initial_quantity numeric(14, 4) NOT NULL,
    remaining_quantity numeric(14, 4) NOT NULL,
    cost_per_unit numeric(14, 4) NOT NULL DEFAULT 0.0000,
    expiry_date date,
    received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_batch_prod_exp_idx ON inventory.stock_batch (product_id, expiry_date);

CREATE TABLE IF NOT EXISTS inventory.stock_movement (
    id text PRIMARY KEY,
    movement_type text NOT NULL,
    product_id text NOT NULL REFERENCES inventory.product(id) ON DELETE CASCADE,
    variant_id text REFERENCES inventory.product_variant(id) ON DELETE CASCADE,
    location_id text NOT NULL REFERENCES inventory.stock_location(id) ON DELETE RESTRICT,
    quantity numeric(14, 4) NOT NULL,
    unit_cost numeric(14, 4) NOT NULL DEFAULT 0.0000,
    source_type text NOT NULL DEFAULT 'manual',
    source_id text,
    transfer_id text,
    reason text,
    note text,
    created_by_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movement_prod_idx ON inventory.stock_movement (product_id, created_at);
CREATE INDEX IF NOT EXISTS stock_movement_loc_idx ON inventory.stock_movement (location_id, created_at);

CREATE TABLE IF NOT EXISTS inventory.stock_count (
    id text PRIMARY KEY,
    count_number text NOT NULL UNIQUE,
    warehouse_id text NOT NULL REFERENCES inventory.warehouse(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'draft',
    notes text,
    counted_by_id text,
    approved_by_id text,
    counted_at timestamptz,
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.stock_count_line (
    id text PRIMARY KEY,
    count_id text NOT NULL REFERENCES inventory.stock_count(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES inventory.product(id) ON DELETE CASCADE,
    variant_id text REFERENCES inventory.product_variant(id) ON DELETE CASCADE,
    system_quantity numeric(14, 4) NOT NULL DEFAULT 0.0000,
    counted_quantity numeric(14, 4) NOT NULL DEFAULT 0.0000,
    variance numeric(14, 4) NOT NULL DEFAULT 0.0000,
    notes text
);
CREATE INDEX IF NOT EXISTS stock_count_line_count_idx ON inventory.stock_count_line (count_id);

-- +goose Down
DROP TABLE IF EXISTS inventory.stock_count_line;
DROP TABLE IF EXISTS inventory.stock_count;
DROP TABLE IF EXISTS inventory.stock_movement;
DROP TABLE IF EXISTS inventory.stock_batch;
DROP TABLE IF EXISTS inventory.stock_level;
DROP TABLE IF EXISTS inventory.product_variant;
DROP TABLE IF EXISTS inventory.product;
DROP TABLE IF EXISTS inventory.product_category;
DROP TABLE IF EXISTS inventory.stock_location;
DROP TABLE IF EXISTS inventory.warehouse;