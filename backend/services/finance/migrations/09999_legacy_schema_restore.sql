-- +goose Up
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS deal_id TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS subtotal DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS vat_amount DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS other_tax_amount DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS discount_value DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS discount_amount DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS total_amount DECIMAL;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS approval_revision INTEGER;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS delivery_channel TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS notes_en TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS notes_ar TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS sales_owner_id TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS signed_by_id TEXT;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE finance.invoice ADD COLUMN IF NOT EXISTS signer_signature_url TEXT;
CREATE TABLE IF NOT EXISTS finance.invoice_line_item (
id TEXT PRIMARY KEY,
invoice_id TEXT,
service_id TEXT,
description_en TEXT,
description_ar TEXT,
quantity DECIMAL,
unit_price DECIMAL,
line_total DECIMAL,
display_order INTEGER
);

ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS amount DECIMAL;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS receipt_pdf_path TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS notification_channel TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS signed_by_id TEXT;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS signer_signature_url TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS display_order INTEGER;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS is_system BOOLEAN;
ALTER TABLE finance.expense_category ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS deal_id TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS amount DECIMAL;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS net_amount DECIMAL;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS input_vat_amount DECIMAL;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS is_vat_recoverable BOOLEAN;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS tax_invoice_number TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS expense_date TIMESTAMPTZ;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS is_billable BOOLEAN;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS recurrence_interval TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE finance.expense ADD COLUMN IF NOT EXISTS recurring_expense_id TEXT;
CREATE TABLE IF NOT EXISTS finance.payment_allocation (
id TEXT PRIMARY KEY,
payment_id TEXT,
invoice_id TEXT,
allocated_amount DECIMAL,
currency TEXT,
allocated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS finance.expense_claim (
id TEXT PRIMARY KEY,
claim_number TEXT UNIQUE,
claimant_id TEXT,
amount DECIMAL,
currency TEXT,
expense_date TIMESTAMPTZ,
reason TEXT,
category_id TEXT,
deal_id TEXT,
invoice_id TEXT,
calendar_event_id TEXT,
receipt_url TEXT,
status TEXT,
review_notes TEXT,
scheduled_at TIMESTAMPTZ,
scheduled_for_date TIMESTAMPTZ,
scheduled_by_id TEXT,
paid_at TIMESTAMPTZ,
paid_by_id TEXT,
payment_method TEXT,
payment_reference TEXT,
expense_id TEXT UNIQUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.commission_payout (
id TEXT PRIMARY KEY,
user_id TEXT,
period_month TEXT,
basis_amount DECIMAL,
rate_percent DECIMAL,
amount DECIMAL,
currency TEXT,
expense_id TEXT UNIQUE,
payroll_item_id TEXT UNIQUE,
recorded_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.tax_rate (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
rate_percent DECIMAL,
registration_number TEXT,
certificate_url TEXT,
certificate_valid_until TIMESTAMPTZ,
applies_to_invoices BOOLEAN,
applies_to_quotations BOOLEAN,
is_active BOOLEAN,
display_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.document_tax (
id TEXT PRIMARY KEY,
invoice_id TEXT,
quotation_id TEXT,
tax_rate_id TEXT,
code TEXT,
name_en TEXT,
name_ar TEXT,
rate_percent DECIMAL,
registration_number TEXT,
amount DECIMAL,
display_order INTEGER
);

CREATE TABLE IF NOT EXISTS finance.recurring_expense (
id TEXT PRIMARY KEY,
title_en TEXT,
title_ar TEXT,
category_id TEXT,
vendor_name TEXT,
reference TEXT,
amount DECIMAL,
input_vat_amount DECIMAL,
is_vat_recoverable BOOLEAN,
currency TEXT,
payment_method TEXT,
frequency TEXT,
start_date TIMESTAMPTZ,
end_date TIMESTAMPTZ,
next_due_date TIMESTAMPTZ,
auto_record BOOLEAN,
remind_days_before INTEGER,
is_active BOOLEAN,
notes TEXT,
created_by_id TEXT,
last_recorded_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.supplier_bill (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
supplier_ref TEXT,
supplier_id TEXT,
purchase_order_id TEXT,
bill_date TIMESTAMPTZ,
due_date TIMESTAMPTZ,
status TEXT,
subtotal DECIMAL,
vat_amount DECIMAL,
total DECIMAL,
amount_paid DECIMAL,
expense_id TEXT UNIQUE,
override_reason TEXT,
attachment_url TEXT,
note TEXT,
created_by_id TEXT,
approved_by_id TEXT,
approved_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.supplier_bill_line (
id TEXT PRIMARY KEY,
bill_id TEXT,
order_line_id TEXT,
description TEXT,
quantity DECIMAL,
unit_price DECIMAL,
sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS finance.supplier_payment (
id TEXT PRIMARY KEY,
bill_id TEXT,
amount DECIMAL,
paid_on TIMESTAMPTZ,
method TEXT,
reference TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.payment_attempt (
id TEXT PRIMARY KEY,
order_id TEXT,
gateway TEXT,
session_id TEXT,
gateway_payment_id TEXT,
amount DECIMAL,
currency TEXT,
status TEXT,
test_mode BOOLEAN,
payment_id TEXT,
amount_refunded DECIMAL,
failure_reason TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
paid_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.payment_webhook_event (
gateway TEXT,
event_id TEXT,
attempt_id TEXT,
received_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS finance.agency_invoice (
id TEXT PRIMARY KEY,
agency_id TEXT,
reference TEXT,
invoice_date TIMESTAMPTZ,
amount DECIMAL,
expense_id TEXT UNIQUE,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.journal_entry (
id TEXT PRIMARY KEY,
source_key TEXT UNIQUE,
request_hash TEXT,
period_id TEXT,
posting_date TIMESTAMPTZ,
currency TEXT,
memo TEXT,
branch_id TEXT,
reversal_of_id TEXT UNIQUE,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.journal_line (
id TEXT PRIMARY KEY,
entry_id TEXT,
account_id TEXT,
debit DECIMAL,
credit DECIMAL,
memo TEXT
);

CREATE TABLE IF NOT EXISTS finance.cash_drawer (
id TEXT PRIMARY KEY,
register_id TEXT,
code TEXT,
name TEXT,
currency TEXT,
opening_float DECIMAL,
current_balance DECIMAL,
is_active BOOLEAN,
revision INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.cashier_session (
id TEXT PRIMARY KEY,
register_id TEXT,
drawer_id TEXT,
cashier_id TEXT,
shift_id TEXT,
opened_at TIMESTAMPTZ,
closed_at TIMESTAMPTZ,
opening_float DECIMAL,
closing_float DECIMAL,
expected_cash DECIMAL,
actual_cash DECIMAL,
cash_difference DECIMAL,
total_sales DECIMAL,
total_returns DECIMAL,
status TEXT,
note TEXT,
revision INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.payment_method_config (
id TEXT PRIMARY KEY,
branch_id TEXT,
code TEXT,
name_en TEXT,
name_ar TEXT,
is_enabled BOOLEAN,
allow_change BOOLEAN,
requires_reference BOOLEAN,
surcharge_rate DECIMAL,
sort_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.payment_collection (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
branch_id TEXT,
session_id TEXT,
order_id TEXT,
invoice_id TEXT,
amount DECIMAL,
currency TEXT,
method_code TEXT,
reference_number TEXT,
evidence JSONB,
status TEXT,
collected_by_id TEXT,
collected_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS finance.commission_rule (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name TEXT,
rate DECIMAL,
effective_from TIMESTAMPTZ,
effective_to TIMESTAMPTZ,
version INTEGER,
is_active BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.commission_snapshot (
id TEXT PRIMARY KEY,
order_id TEXT,
order_line_id TEXT,
attributed_user_id TEXT,
rule_id TEXT,
rule_version INTEGER,
rule_rate DECIMAL,
basis_amount DECIMAL,
commission_amount DECIMAL,
currency TEXT,
status TEXT,
reversal_of_id TEXT UNIQUE,
calculation_details JSONB,
earned_at TIMESTAMPTZ,
created_by_id TEXT
);

-- +goose Down