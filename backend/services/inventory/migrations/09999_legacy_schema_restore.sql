-- +goose Up
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE inventory.product_category ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS cost DECIMAL;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS price DECIMAL;
ALTER TABLE inventory.product ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS price DECIMAL;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS cost DECIMAL;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE inventory.product_variant ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_location ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.stock_location ADD COLUMN IF NOT EXISTS warehouse_id TEXT;
ALTER TABLE inventory.stock_location ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE inventory.stock_location ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE inventory.stock_location ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE inventory.stock_location ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS inventory.stock_item (
id TEXT PRIMARY KEY,
product_id TEXT,
variant_key TEXT,
average_cost DECIMAL,
reorder_point DECIMAL,
reorder_quantity DECIMAL,
low_alerted_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory.stock_batch ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.stock_batch ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE inventory.stock_batch ADD COLUMN IF NOT EXISTS variant_key TEXT;
ALTER TABLE inventory.stock_batch ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE inventory.stock_batch ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE inventory.stock_batch ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS variant_key TEXT;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS batch_key TEXT;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS on_hand DECIMAL;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS reserved DECIMAL;
ALTER TABLE inventory.stock_level ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS variant_key TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS batch_key TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS quantity DECIMAL;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS unit_cost DECIMAL;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE inventory.stock_movement ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS warehouse_id TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS approved_by_id TEXT;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_count ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS count_id TEXT;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS variant_key TEXT;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS batch_key TEXT;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS expected DECIMAL;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS counted DECIMAL;
ALTER TABLE inventory.stock_count_line ADD COLUMN IF NOT EXISTS note TEXT;
CREATE TABLE IF NOT EXISTS inventory.purchase_requisition (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
requested_by_id TEXT,
department_id TEXT,
status TEXT,
needed_by TIMESTAMPTZ,
note TEXT,
decision_note TEXT,
estimated_total DECIMAL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.purchase_requisition_line (
id TEXT PRIMARY KEY,
requisition_id TEXT,
product_id TEXT,
variant_key TEXT,
description TEXT,
quantity DECIMAL,
estimated_unit_cost DECIMAL,
sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS inventory.rfq (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
requisition_id TEXT,
title TEXT,
status TEXT,
due_date TIMESTAMPTZ,
note TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.rfq_line (
id TEXT PRIMARY KEY,
rfq_id TEXT,
product_id TEXT,
variant_key TEXT,
description TEXT,
quantity DECIMAL,
sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS inventory.rfq_quote (
id TEXT PRIMARY KEY,
rfq_id TEXT,
line_id TEXT,
supplier_id TEXT,
unit_price DECIMAL,
lead_time_days INTEGER,
note TEXT,
selected BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.purchase_order (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
supplier_id TEXT,
status TEXT,
order_date TIMESTAMPTZ,
expected_date TIMESTAMPTZ,
warehouse_id TEXT,
requisition_id TEXT,
rfq_id TEXT,
note TEXT,
terms TEXT,
vat_enabled BOOLEAN,
vat_percentage DECIMAL,
subtotal DECIMAL,
vat_amount DECIMAL,
total DECIMAL,
sent_at TIMESTAMPTZ,
sent_via TEXT,
created_by_id TEXT,
approved_by_id TEXT,
approved_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.purchase_order_line (
id TEXT PRIMARY KEY,
purchase_order_id TEXT,
product_id TEXT,
variant_key TEXT,
description TEXT,
quantity DECIMAL,
unit_price DECIMAL,
received_quantity DECIMAL,
rejected_quantity DECIMAL,
billed_quantity DECIMAL,
sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS inventory.goods_receipt (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
purchase_order_id TEXT,
location_id TEXT,
received_by_id TEXT,
received_at TIMESTAMPTZ,
note TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.goods_receipt_line (
id TEXT PRIMARY KEY,
receipt_id TEXT,
order_line_id TEXT,
quantity DECIMAL,
rejected_quantity DECIMAL,
reject_reason TEXT,
batch_number TEXT,
expiry_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory.product_packaging_unit (
id TEXT PRIMARY KEY,
product_id TEXT,
code TEXT,
name TEXT,
base_units DECIMAL,
indivisible BOOLEAN,
barcode TEXT UNIQUE,
revision INTEGER,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.stock_serial (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
product_id TEXT,
variant_key TEXT,
batch_key TEXT,
location_id TEXT,
manufacturer_serial TEXT,
manufacturer_scope TEXT,
status TEXT,
package_id TEXT,
generation_id TEXT,
revision INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.stock_package (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
kind TEXT,
location_id TEXT,
parent_id TEXT,
status TEXT,
seal_number TEXT,
revision INTEGER,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.stock_trace_event (
id TEXT PRIMARY KEY,
entity_type TEXT,
entity_id TEXT,
revision INTEGER,
action TEXT,
actor_id TEXT,
details JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.stock_allocation (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
kind TEXT,
source_location_id TEXT,
transit_location_id TEXT,
destination_location_id TEXT,
status TEXT,
revision INTEGER,
created_by_id TEXT,
approved_by_id TEXT,
carrier_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.stock_allocation_line (
id TEXT PRIMARY KEY,
allocation_id TEXT,
product_id TEXT,
variant_key TEXT,
batch_key TEXT,
requested DECIMAL,
dispatched DECIMAL,
received DECIMAL,
rejected DECIMAL,
unit_snapshot JSONB
);

CREATE TABLE IF NOT EXISTS inventory.stock_acknowledgment (
id TEXT PRIMARY KEY,
allocation_id TEXT,
revision INTEGER,
stage TEXT,
actor_id TEXT,
signer_name TEXT,
statement TEXT,
manifest JSONB,
manifest_hash TEXT,
signature TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down