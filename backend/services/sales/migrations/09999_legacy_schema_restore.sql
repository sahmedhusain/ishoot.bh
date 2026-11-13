-- +goose Up
CREATE TABLE IF NOT EXISTS sales.crm_contact (
id TEXT PRIMARY KEY,
first_name TEXT,
last_name TEXT,
email TEXT,
email_norm TEXT,
phone TEXT,
phone_e164 TEXT,
company_name TEXT,
vat_number TEXT,
job_title TEXT,
contact_type TEXT,
client_kind TEXT,
company_origin TEXT,
company_name_ar TEXT,
legal_form TEXT,
cr_number TEXT,
cr_expiry_date TIMESTAMPTZ,
registration_number TEXT,
registration_country TEXT,
government_type TEXT,
supplier_number TEXT,
requires_purchase_order BOOLEAN,
nationality TEXT,
industry TEXT,
website TEXT,
preferred_language TEXT,
payment_terms_days INTEGER,
address_country TEXT,
address_city TEXT,
address_area TEXT,
address_block TEXT,
address_road TEXT,
address_building TEXT,
address_unit TEXT,
address_line TEXT,
address_state TEXT,
address_postal_code TEXT,
address_po_box TEXT,
notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
supplier_lead_time_days INTEGER,
supplier_payment_terms_days INTEGER
);

CREATE TABLE IF NOT EXISTS sales.crm_deal (
id TEXT PRIMARY KEY,
contact_id TEXT,
source_inquiry_id TEXT UNIQUE,
title TEXT,
deal_stage TEXT,
deal_value DECIMAL,
currency TEXT,
probability INTEGER,
expected_close_date TIMESTAMPTZ,
shoot_date TIMESTAMPTZ,
lost_reason TEXT,
assigned_to TEXT,
notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales.deal_pipeline_stage (
id TEXT PRIMARY KEY,
name_en TEXT,
name_ar TEXT,
sort_order INTEGER,
probability INTEGER,
kind TEXT,
color TEXT,
is_system BOOLEAN,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS quotation_number TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS revision INTEGER;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS deal_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS inquiry_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS valid_until_date TIMESTAMPTZ;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS subtotal DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS vat_amount DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS other_tax_amount DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS discount_value DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS discount_amount DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS total_amount DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS acceptance_evidence TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS approval_revision INTEGER;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS raw_rate DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS fx_margin_percent DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS effective_rate DECIMAL;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS delivery_channel TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS terms_en TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS terms_ar TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS sales_owner_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS signed_by_id TEXT;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE sales.quotation ADD COLUMN IF NOT EXISTS signer_signature_url TEXT;
CREATE TABLE IF NOT EXISTS sales.quotation_line_item (
id TEXT PRIMARY KEY,
quotation_id TEXT,
description_en TEXT,
description_ar TEXT,
quantity DECIMAL,
unit_price DECIMAL,
line_total DECIMAL,
order_index INTEGER
);

CREATE TABLE IF NOT EXISTS sales.sales_attribution_change (
id TEXT PRIMARY KEY,
entity_type TEXT,
entity_id TEXT,
from_user_id TEXT,
to_user_id TEXT,
changed_by_id TEXT,
reason TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales.sales_order (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
customer_id TEXT,
contact_id TEXT,
email TEXT,
name TEXT,
phone TEXT,
channel TEXT,
status TEXT,
payment_status TEXT,
payment_method TEXT,
fulfilment TEXT,
shipping_address JSONB,
subtotal DECIMAL,
discount_amount DECIMAL,
coupon_code TEXT,
vat_amount DECIMAL,
delivery_fee DECIMAL,
total DECIMAL,
amount_paid DECIMAL,
amount_refunded DECIMAL,
currency TEXT,
locale TEXT,
note TEXT,
warehouse_id TEXT,
invoice_id TEXT UNIQUE,
created_by_id TEXT,
placed_at TIMESTAMPTZ,
paid_at TIMESTAMPTZ,
shipped_at TIMESTAMPTZ,
delivered_at TIMESTAMPTZ,
cancelled_at TIMESTAMPTZ,
utm_campaign TEXT,
utm_source TEXT,
utm_medium TEXT,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales.sales_order_line (
id TEXT PRIMARY KEY,
order_id TEXT,
product_id TEXT,
variant_key TEXT,
sku TEXT,
description TEXT,
quantity DECIMAL,
unit_price DECIMAL,
vat_exempt BOOLEAN,
line_total DECIMAL,
location_id TEXT,
returned_quantity DECIMAL,
sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS sales.sales_order_event (
id TEXT PRIMARY KEY,
order_id TEXT,
kind TEXT,
status TEXT,
note TEXT,
amount DECIMAL,
by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS budget DECIMAL;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS spend DECIMAL;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE sales.campaign ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
-- +goose Down