-- +goose Up
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS locale TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS apple_sub TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS crm_contact_id TEXT;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE commerce.customer ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS commerce.customer_session (
id TEXT PRIMARY KEY,
customer_id TEXT,
token_hash TEXT UNIQUE,
expires_at TIMESTAMPTZ,
user_agent TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS line1 TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS line2 TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS is_default BOOLEAN;
ALTER TABLE commerce.customer_address ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS commerce.customer_auth_code (
id TEXT PRIMARY KEY,
email TEXT,
code_hash TEXT,
attempts INTEGER,
expires_at TIMESTAMPTZ,
used_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS guest_checkout BOOLEAN;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS free_delivery_over DECIMAL;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS cod_enabled BOOLEAN;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS bank_instructions_en TEXT;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS bank_instructions_ar TEXT;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS order_notify_email TEXT;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS payment_gateway TEXT;
ALTER TABLE commerce.store_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS value DECIMAL;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS min_order DECIMAL;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS max_uses INTEGER;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS used_count INTEGER;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE commerce.coupon ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS commerce.delivery_settings (
id TEXT PRIMARY KEY,
mode TEXT,
sla_hours INTEGER,
time_zone TEXT,
slot_days INTEGER,
lead_minutes INTEGER,
require_slot BOOLEAN,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce.delivery_zone (
id TEXT PRIMARY KEY,
name_en TEXT,
name_ar TEXT,
fee DECIMAL,
min_order DECIMAL,
free_over DECIMAL,
is_active BOOLEAN,
sort_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce.delivery_slot (
id TEXT PRIMARY KEY,
zone_id TEXT,
weekday INTEGER,
start TEXT,
"end" TEXT,
capacity INTEGER,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce.shipment (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
order_id TEXT,
status TEXT,
method TEXT,
zone_id TEXT,
slot_id TEXT,
slot_date TIMESTAMPTZ,
slot_start TEXT,
slot_end TEXT,
promised_by TIMESTAMPTZ,
recipient_name TEXT,
recipient_phone TEXT,
address JSONB,
cod_amount DECIMAL,
cod_collected DECIMAL,
tracking_token TEXT UNIQUE,
attempts INTEGER,
failure_reason TEXT,
out_at TIMESTAMPTZ,
delivered_at TIMESTAMPTZ,
driver_id TEXT,
vehicle_id TEXT,
route_sheet_id TEXT,
route_stop INTEGER,
proof_photo_url TEXT,
proof_signature TEXT,
cod_settlement_id TEXT,
agency_id TEXT,
tracking_number TEXT,
courier_booking_agency_id TEXT,
courier_booking_status TEXT,
courier_booking_started_at TIMESTAMPTZ,
label_url TEXT,
agency_fee DECIMAL,
agency_invoice_id TEXT,
tracked_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce.shipment_event (
id TEXT PRIMARY KEY,
shipment_id TEXT,
status TEXT,
reason TEXT,
note TEXT,
by_id TEXT,
at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS commerce.customer_segment (
id TEXT PRIMARY KEY,
name TEXT
);

ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS revision INTEGER;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE commerce.retail_register ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS business_date TIMESTAMPTZ;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS closed_by_id TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS total_sales DECIMAL;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS total_returns DECIMAL;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS total_cash DECIMAL;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS total_card DECIMAL;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS total_other DECIMAL;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS cash_variance DECIMAL;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS snapshot JSONB;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS journal_id TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE commerce.retail_closing ADD COLUMN IF NOT EXISTS revision INTEGER;
CREATE TABLE IF NOT EXISTS commerce.store_region (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
currency TEXT,
default_language TEXT,
branch_id TEXT,
is_enabled BOOLEAN,
price_multiplier DECIMAL,
settings JSONB
);

-- +goose Down