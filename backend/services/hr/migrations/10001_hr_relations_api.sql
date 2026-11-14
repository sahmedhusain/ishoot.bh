-- +goose Up
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS manager_id text;

CREATE INDEX IF NOT EXISTS idx_employee_user_id ON hr.employee (user_id);
CREATE INDEX IF NOT EXISTS idx_employee_manager_id ON hr.employee (manager_id);

-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_manager_id' AND conrelid = 'hr.employee'::regclass) THEN
        UPDATE hr.employee SET manager_id = NULL WHERE manager_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.employee.manager_id);
        ALTER TABLE hr.employee ADD CONSTRAINT fk_employee_manager_id FOREIGN KEY (manager_id) REFERENCES hr.employee(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd

CREATE TABLE IF NOT EXISTS hr.leave_balance (
    id text PRIMARY KEY,
    employee_id text NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    leave_type_id text REFERENCES hr.leave_type(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    leave_type text NOT NULL DEFAULT 'annual',
    year integer NOT NULL,
    entitled_days numeric(6, 2) NOT NULL DEFAULT 0,
    used_days numeric(6, 2) NOT NULL DEFAULT 0,
    remaining_days numeric(6, 2) NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leave_balance_emp_year ON hr.leave_balance (employee_id, year);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_leave_balance_emp_type_year ON hr.leave_balance (employee_id, leave_type, year);

ALTER TABLE hr.leave_request DROP CONSTRAINT IF EXISTS fk_leave_request_approved_by;

CREATE TABLE IF NOT EXISTS hr.identity_user_ref (
    subject_id text PRIMARY KEY,
    realm text NOT NULL DEFAULT 'staff',
    display_name text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'active',
    employee_id text REFERENCES hr.employee(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_identity_user_ref_email ON hr.identity_user_ref (email);
CREATE INDEX IF NOT EXISTS idx_identity_user_ref_employee_id ON hr.identity_user_ref (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_credential_emp ON hr.employee_credential (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_handover_emp ON hr.employee_handover (employee_id, delegate_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_recurring_pay_emp ON hr.employee_recurring_pay (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_emp_run ON hr.payroll_item (employee_id, payroll_run_id);

-- +goose Down
DROP TABLE IF EXISTS hr.identity_user_ref;
DROP TABLE IF EXISTS hr.leave_balance;
ALTER TABLE hr.employee DROP CONSTRAINT IF EXISTS fk_employee_manager_id;
DROP INDEX IF EXISTS hr.idx_employee_manager_id;
ALTER TABLE hr.employee DROP COLUMN IF EXISTS manager_id;
