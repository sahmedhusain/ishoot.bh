-- +goose Up
CREATE TABLE IF NOT EXISTS identity."user" (
id TEXT PRIMARY KEY,
email TEXT UNIQUE,
full_name TEXT,
password_hash TEXT,
role TEXT,
permissions JSONB,
avatar_url TEXT,
signature_url TEXT,
phone TEXT,
department TEXT,
department_id TEXT,
manager_id TEXT,
is_active BOOLEAN,
last_login_at TIMESTAMPTZ,
mfa_enabled BOOLEAN,
mfa_secret_encrypted TEXT,
mfa_pending_secret_encrypted TEXT,
mfa_pending_expires_at TIMESTAMPTZ,
mfa_last_step BIGINT,
reset_token TEXT,
reset_expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
discount_limit_percent DECIMAL,
commission_rate_percent DECIMAL,
archived_at TIMESTAMPTZ,
archived_by_id TEXT,
suspended_at TIMESTAMPTZ,
suspended_by_id TEXT,
suspension_reason TEXT
);

CREATE TABLE IF NOT EXISTS identity.permission (
id TEXT PRIMARY KEY,
role TEXT,
resource TEXT,
action TEXT,
allowed BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity.session (
id TEXT PRIMARY KEY,
user_id TEXT,
token TEXT UNIQUE,
ip_address TEXT,
user_agent TEXT,
expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity.role (
id TEXT PRIMARY KEY,
name_en TEXT,
name_ar TEXT,
is_system BOOLEAN,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity.role_data_scope (
role TEXT,
area TEXT,
scope TEXT
);

ALTER TABLE identity.mfa_recovery_code ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE identity.mfa_recovery_code ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE identity.mfa_recovery_code ADD COLUMN IF NOT EXISTS code_hash TEXT;
ALTER TABLE identity.mfa_recovery_code ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS identity.auth_challenge (
id TEXT PRIMARY KEY,
user_id TEXT,
email TEXT,
type TEXT,
code_hash TEXT,
expires_at TIMESTAMPTZ,
attempts INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity.branch (
id TEXT PRIMARY KEY,
code TEXT UNIQUE,
name TEXT,
time_zone TEXT,
business_day_start INTEGER,
is_active BOOLEAN,
revision INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity.branch_grant (
id TEXT PRIMARY KEY,
branch_id TEXT,
user_id TEXT,
can_manage BOOLEAN
);

-- +goose Down