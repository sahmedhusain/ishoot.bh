-- +goose Up
-- IT Roles & Permissions Tables (Dynamic RBAC from Database)
CREATE TABLE IF NOT EXISTS identity.it_role (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    is_system boolean NOT NULL DEFAULT false,
    reporting_to_role text REFERENCES identity.it_role(id) ON DELETE SET NULL,
    revision bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.it_permission (
    id text PRIMARY KEY,
    role_id text NOT NULL REFERENCES identity.it_role(id) ON DELETE CASCADE,
    resource text NOT NULL,
    action text NOT NULL,
    allowed boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (role_id, resource, action)
);

-- Reporting Hierarchy on Staff Roles
ALTER TABLE identity.staff_role ADD COLUMN IF NOT EXISTS reporting_to_role text REFERENCES identity.staff_role(id) ON DELETE SET NULL;

-- Account-level Reporting Line (Who reports to whom in IT and Staff)
ALTER TABLE identity.account ADD COLUMN IF NOT EXISTS reporting_to text;
ALTER TABLE identity.account ADD CONSTRAINT account_reporting_to_fkey
    FOREIGN KEY (realm, reporting_to) REFERENCES identity.account(realm, subject_id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE identity.account DROP CONSTRAINT IF EXISTS account_reporting_to_fkey;
ALTER TABLE identity.account DROP COLUMN IF EXISTS reporting_to;
ALTER TABLE identity.staff_role DROP COLUMN IF EXISTS reporting_to_role;
DROP TABLE IF EXISTS identity.it_permission;
DROP TABLE IF EXISTS identity.it_role;
