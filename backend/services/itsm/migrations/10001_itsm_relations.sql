-- +goose Up
ALTER TABLE itsm.ticket ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE itsm.ticket ADD COLUMN IF NOT EXISTS department_id text;
ALTER TABLE itsm.ticket ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE itsm.ticket ADD COLUMN IF NOT EXISTS asset_id text;
ALTER TABLE itsm.ticket ADD COLUMN IF NOT EXISTS document_id text;

CREATE INDEX IF NOT EXISTS idx_itsm_ticket_employee_id ON itsm.ticket (employee_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_department_id ON itsm.ticket (department_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_project_id ON itsm.ticket (project_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_asset_id ON itsm.ticket (asset_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_document_id ON itsm.ticket (document_id);

-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_itsm_ticket_asset_id' AND conrelid = 'itsm.ticket'::regclass) THEN
        UPDATE itsm.ticket SET asset_id = NULL WHERE asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM itsm.asset p WHERE p.id = itsm.ticket.asset_id);
        ALTER TABLE itsm.ticket ADD CONSTRAINT fk_itsm_ticket_asset_id FOREIGN KEY (asset_id) REFERENCES itsm.asset(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS idx_itsm_asset_handover_emp_asset ON itsm.asset_handover (asset_id, employee_id);

CREATE TABLE IF NOT EXISTS itsm.staff_ref (
    employee_id text PRIMARY KEY,
    user_id text,
    employee_number text NOT NULL DEFAULT '',
    name_en text NOT NULL DEFAULT '',
    name_ar text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    department_id text,
    status text NOT NULL DEFAULT 'active',
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_itsm_staff_ref_user_id ON itsm.staff_ref (user_id);
CREATE INDEX IF NOT EXISTS idx_itsm_staff_ref_email ON itsm.staff_ref (email);

-- +goose Down
DROP TABLE IF EXISTS itsm.staff_ref;
ALTER TABLE itsm.ticket DROP CONSTRAINT IF EXISTS fk_itsm_ticket_asset_id;
DROP INDEX IF EXISTS itsm.idx_itsm_ticket_document_id;
DROP INDEX IF EXISTS itsm.idx_itsm_ticket_asset_id;
DROP INDEX IF EXISTS itsm.idx_itsm_ticket_project_id;
DROP INDEX IF EXISTS itsm.idx_itsm_ticket_department_id;
DROP INDEX IF EXISTS itsm.idx_itsm_ticket_employee_id;
ALTER TABLE itsm.ticket DROP COLUMN IF EXISTS document_id;
ALTER TABLE itsm.ticket DROP COLUMN IF EXISTS asset_id;
ALTER TABLE itsm.ticket DROP COLUMN IF EXISTS project_id;
ALTER TABLE itsm.ticket DROP COLUMN IF EXISTS department_id;
ALTER TABLE itsm.ticket DROP COLUMN IF EXISTS employee_id;
