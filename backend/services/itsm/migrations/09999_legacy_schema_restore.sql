-- +goose Up
CREATE TABLE IF NOT EXISTS itsm.company_asset (
id TEXT PRIMARY KEY,
asset_key TEXT UNIQUE,
title TEXT,
file_url TEXT,
mime_type TEXT,
file_size INTEGER,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm.support_reimbursement (
id TEXT PRIMARY KEY,
employee_id TEXT,
provider TEXT,
period_start TEXT,
period_end TEXT,
claimed_amount DECIMAL,
received_amount DECIMAL,
received_on TIMESTAMPTZ,
reference TEXT,
recorded_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm.asset_category (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT
);

CREATE TABLE IF NOT EXISTS itsm.asset (
id TEXT PRIMARY KEY,
asset_tag TEXT UNIQUE,
category_id TEXT,
name TEXT,
brand TEXT,
model TEXT,
serial_number TEXT,
purchase_date TIMESTAMPTZ,
purchase_cost DECIMAL,
currency TEXT,
supplier TEXT,
invoice_reference TEXT,
warranty_until TIMESTAMPTZ,
condition TEXT,
status TEXT,
specs JSONB
);

CREATE TABLE IF NOT EXISTS itsm.asset_handover (
id TEXT PRIMARY KEY,
reference TEXT UNIQUE,
asset_id TEXT,
employee_id TEXT,
kind TEXT,
status TEXT,
handover_date TIMESTAMPTZ,
condition TEXT
);

CREATE TABLE IF NOT EXISTS itsm.support_program (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
provider TEXT,
claim_period_months INTEGER,
prorate BOOLEAN,
is_active BOOLEAN,
notes TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm.support_program_rule (
id TEXT PRIMARY KEY,
program_id TEXT,
effective_from TIMESTAMPTZ,
effective_to TIMESTAMPTZ,
wage_basis TEXT
);

CREATE TABLE IF NOT EXISTS itsm.task (
id TEXT PRIMARY KEY,
number TEXT UNIQUE,
title TEXT,
description TEXT,
project_id TEXT,
status TEXT,
priority TEXT,
assignee_id TEXT,
department_id TEXT,
start_date TIMESTAMPTZ,
due_date TIMESTAMPTZ,
sort_order INTEGER,
link_type TEXT,
link_id TEXT,
created_by_id TEXT,
completed_at TIMESTAMPTZ,
reminded_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm.task_comment (
id TEXT PRIMARY KEY,
task_id TEXT,
author_id TEXT,
body TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down