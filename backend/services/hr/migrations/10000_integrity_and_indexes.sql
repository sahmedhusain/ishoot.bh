-- +goose Up
ALTER TABLE hr.gosi_settings ADD COLUMN IF NOT EXISTS id text NOT NULL DEFAULT 'default';
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'hr.gosi_settings'::regclass AND contype = 'p') THEN
        ALTER TABLE hr.gosi_settings ADD CONSTRAINT gosi_settings_pkey PRIMARY KEY (id);
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_attendance_entry_shift_type_id ON hr.attendance_entry (shift_type_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_entry_shift_type_id' AND conrelid = 'hr.attendance_entry'::regclass) THEN
        UPDATE hr.attendance_entry SET shift_type_id = NULL WHERE shift_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.shift_type p WHERE p.id = hr.attendance_entry.shift_type_id);
        ALTER TABLE hr.attendance_entry ADD CONSTRAINT fk_attendance_entry_shift_type_id FOREIGN KEY (shift_type_id) REFERENCES hr.shift_type(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_attendance_entry_recorded_by_id ON hr.attendance_entry (recorded_by_id);
CREATE INDEX IF NOT EXISTS idx_department_head_id ON hr.department (head_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_department_head_id' AND conrelid = 'hr.department'::regclass) THEN
        UPDATE hr.department SET head_id = NULL WHERE head_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.department.head_id);
        ALTER TABLE hr.department ADD CONSTRAINT fk_department_head_id FOREIGN KEY (head_id) REFERENCES hr.employee(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_department_parent_id ON hr.department (parent_id);
CREATE INDEX IF NOT EXISTS idx_department_manager_id ON hr.department (manager_id);
CREATE INDEX IF NOT EXISTS idx_department_deputy_id ON hr.department (deputy_id);
CREATE INDEX IF NOT EXISTS idx_employee_user_id ON hr.employee (user_id);
CREATE INDEX IF NOT EXISTS idx_employee_credential_employee_id ON hr.employee_credential (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_credential_employee_id' AND conrelid = 'hr.employee_credential'::regclass) THEN
        DELETE FROM hr.employee_credential WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.employee_credential.employee_id);
        ALTER TABLE hr.employee_credential ADD CONSTRAINT fk_employee_credential_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_employee_gosi_record_employee_id ON hr.employee_gosi_record (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_gosi_record_employee_id' AND conrelid = 'hr.employee_gosi_record'::regclass) THEN
        DELETE FROM hr.employee_gosi_record WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.employee_gosi_record.employee_id);
        ALTER TABLE hr.employee_gosi_record ADD CONSTRAINT fk_employee_gosi_record_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_employee_handover_employee_id ON hr.employee_handover (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_handover_employee_id' AND conrelid = 'hr.employee_handover'::regclass) THEN
        DELETE FROM hr.employee_handover WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.employee_handover.employee_id);
        ALTER TABLE hr.employee_handover ADD CONSTRAINT fk_employee_handover_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_employee_handover_leave_request_id ON hr.employee_handover (leave_request_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_handover_leave_request_id' AND conrelid = 'hr.employee_handover'::regclass) THEN
        DELETE FROM hr.employee_handover WHERE leave_request_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.leave_request p WHERE p.id = hr.employee_handover.leave_request_id);
        ALTER TABLE hr.employee_handover ADD CONSTRAINT fk_employee_handover_leave_request_id FOREIGN KEY (leave_request_id) REFERENCES hr.leave_request(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_employee_handover_delegate_user_id ON hr.employee_handover (delegate_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_handover_case_handover_id ON hr.employee_handover_case (handover_id);
CREATE INDEX IF NOT EXISTS idx_employee_handover_case_case_id ON hr.employee_handover_case (case_id);
CREATE INDEX IF NOT EXISTS idx_employee_handover_case_to_user_id ON hr.employee_handover_case (to_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_recurring_pay_employee_id ON hr.employee_recurring_pay (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_recurring_pay_employee_id' AND conrelid = 'hr.employee_recurring_pay'::regclass) THEN
        DELETE FROM hr.employee_recurring_pay WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.employee_recurring_pay.employee_id);
        ALTER TABLE hr.employee_recurring_pay ADD CONSTRAINT fk_employee_recurring_pay_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_employee_support_employee_id ON hr.employee_support (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_support_employee_id' AND conrelid = 'hr.employee_support'::regclass) THEN
        DELETE FROM hr.employee_support WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.employee_support.employee_id);
        ALTER TABLE hr.employee_support ADD CONSTRAINT fk_employee_support_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_employee_support_program_id ON hr.employee_support (program_id);
CREATE INDEX IF NOT EXISTS idx_employee_support_created_by_id ON hr.employee_support (created_by_id);
CREATE INDEX IF NOT EXISTS idx_employee_support_event_support_id ON hr.employee_support_event (support_id);
CREATE INDEX IF NOT EXISTS idx_employee_support_event_actor_id ON hr.employee_support_event (actor_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON hr.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_leave_adjustment_employee_id ON hr.leave_adjustment (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_adjustment_employee_id' AND conrelid = 'hr.leave_adjustment'::regclass) THEN
        DELETE FROM hr.leave_adjustment WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.leave_adjustment.employee_id);
        ALTER TABLE hr.leave_adjustment ADD CONSTRAINT fk_leave_adjustment_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_leave_adjustment_leave_type_id ON hr.leave_adjustment (leave_type_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_adjustment_leave_type_id' AND conrelid = 'hr.leave_adjustment'::regclass) THEN
        DELETE FROM hr.leave_adjustment WHERE leave_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.leave_type p WHERE p.id = hr.leave_adjustment.leave_type_id);
        ALTER TABLE hr.leave_adjustment ADD CONSTRAINT fk_leave_adjustment_leave_type_id FOREIGN KEY (leave_type_id) REFERENCES hr.leave_type(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_leave_adjustment_created_by_id ON hr.leave_adjustment (created_by_id);
CREATE INDEX IF NOT EXISTS idx_leave_request_approved_by ON hr.leave_request (approved_by);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_request_approved_by' AND conrelid = 'hr.leave_request'::regclass) THEN
        UPDATE hr.leave_request SET approved_by = NULL WHERE approved_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.leave_request.approved_by);
        ALTER TABLE hr.leave_request ADD CONSTRAINT fk_leave_request_approved_by FOREIGN KEY (approved_by) REFERENCES hr.employee(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_leave_request_leave_type_id ON hr.leave_request (leave_type_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_request_leave_type_id' AND conrelid = 'hr.leave_request'::regclass) THEN
        UPDATE hr.leave_request SET leave_type_id = NULL WHERE leave_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.leave_type p WHERE p.id = hr.leave_request.leave_type_id);
        ALTER TABLE hr.leave_request ADD CONSTRAINT fk_leave_request_leave_type_id FOREIGN KEY (leave_type_id) REFERENCES hr.leave_type(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_leave_request_approved_by_id ON hr.leave_request (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_employee_id ON hr.payroll_item (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_edited_by_id ON hr.payroll_item (edited_by_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_paid_by_id ON hr.payroll_item (paid_by_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_line_payroll_item_id ON hr.payroll_item_line (payroll_item_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_item_line_payroll_item_id' AND conrelid = 'hr.payroll_item_line'::regclass) THEN
        DELETE FROM hr.payroll_item_line WHERE payroll_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.payroll_item p WHERE p.id = hr.payroll_item_line.payroll_item_id);
        ALTER TABLE hr.payroll_item_line ADD CONSTRAINT fk_payroll_item_line_payroll_item_id FOREIGN KEY (payroll_item_id) REFERENCES hr.payroll_item(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payroll_item_line_recurring_id ON hr.payroll_item_line (recurring_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_line_created_by_id ON hr.payroll_item_line (created_by_id);
CREATE INDEX IF NOT EXISTS idx_payroll_run_approved_by ON hr.payroll_run (approved_by);
CREATE INDEX IF NOT EXISTS idx_payroll_run_approved_by_id ON hr.payroll_run (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_retail_shift_branch_id ON hr.retail_shift (branch_id);
CREATE INDEX IF NOT EXISTS idx_retail_shift_opened_by_id ON hr.retail_shift (opened_by_id);
CREATE INDEX IF NOT EXISTS idx_retail_shift_closed_by_id ON hr.retail_shift (closed_by_id);
CREATE INDEX IF NOT EXISTS idx_salary_document_employee_id ON hr.salary_document (employee_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salary_document_employee_id' AND conrelid = 'hr.salary_document'::regclass) THEN
        UPDATE hr.salary_document SET employee_id = NULL WHERE employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hr.employee p WHERE p.id = hr.salary_document.employee_id);
        ALTER TABLE hr.salary_document ADD CONSTRAINT fk_salary_document_employee_id FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_salary_document_requested_by_id ON hr.salary_document (requested_by_id);
CREATE INDEX IF NOT EXISTS idx_salary_document_reviewed_by_id ON hr.salary_document (reviewed_by_id);

-- +goose Down
DROP INDEX IF EXISTS hr.idx_attendance_entry_shift_type_id;
ALTER TABLE hr.attendance_entry DROP CONSTRAINT IF EXISTS fk_attendance_entry_shift_type_id;
DROP INDEX IF EXISTS hr.idx_attendance_entry_recorded_by_id;
DROP INDEX IF EXISTS hr.idx_department_head_id;
ALTER TABLE hr.department DROP CONSTRAINT IF EXISTS fk_department_head_id;
DROP INDEX IF EXISTS hr.idx_department_parent_id;
DROP INDEX IF EXISTS hr.idx_department_manager_id;
DROP INDEX IF EXISTS hr.idx_department_deputy_id;
DROP INDEX IF EXISTS hr.idx_employee_user_id;
DROP INDEX IF EXISTS hr.idx_employee_credential_employee_id;
ALTER TABLE hr.employee_credential DROP CONSTRAINT IF EXISTS fk_employee_credential_employee_id;
DROP INDEX IF EXISTS hr.idx_employee_gosi_record_employee_id;
ALTER TABLE hr.employee_gosi_record DROP CONSTRAINT IF EXISTS fk_employee_gosi_record_employee_id;
DROP INDEX IF EXISTS hr.idx_employee_handover_employee_id;
ALTER TABLE hr.employee_handover DROP CONSTRAINT IF EXISTS fk_employee_handover_employee_id;
DROP INDEX IF EXISTS hr.idx_employee_handover_leave_request_id;
ALTER TABLE hr.employee_handover DROP CONSTRAINT IF EXISTS fk_employee_handover_leave_request_id;
DROP INDEX IF EXISTS hr.idx_employee_handover_delegate_user_id;
DROP INDEX IF EXISTS hr.idx_employee_handover_case_handover_id;
DROP INDEX IF EXISTS hr.idx_employee_handover_case_case_id;
DROP INDEX IF EXISTS hr.idx_employee_handover_case_to_user_id;
DROP INDEX IF EXISTS hr.idx_employee_recurring_pay_employee_id;
ALTER TABLE hr.employee_recurring_pay DROP CONSTRAINT IF EXISTS fk_employee_recurring_pay_employee_id;
DROP INDEX IF EXISTS hr.idx_employee_support_employee_id;
ALTER TABLE hr.employee_support DROP CONSTRAINT IF EXISTS fk_employee_support_employee_id;
DROP INDEX IF EXISTS hr.idx_employee_support_program_id;
DROP INDEX IF EXISTS hr.idx_employee_support_created_by_id;
DROP INDEX IF EXISTS hr.idx_employee_support_event_support_id;
DROP INDEX IF EXISTS hr.idx_employee_support_event_actor_id;
DROP INDEX IF EXISTS hr.idx_inbox_event_id;
DROP INDEX IF EXISTS hr.idx_leave_adjustment_employee_id;
ALTER TABLE hr.leave_adjustment DROP CONSTRAINT IF EXISTS fk_leave_adjustment_employee_id;
DROP INDEX IF EXISTS hr.idx_leave_adjustment_leave_type_id;
ALTER TABLE hr.leave_adjustment DROP CONSTRAINT IF EXISTS fk_leave_adjustment_leave_type_id;
DROP INDEX IF EXISTS hr.idx_leave_adjustment_created_by_id;
DROP INDEX IF EXISTS hr.idx_leave_request_approved_by;
ALTER TABLE hr.leave_request DROP CONSTRAINT IF EXISTS fk_leave_request_approved_by;
DROP INDEX IF EXISTS hr.idx_leave_request_leave_type_id;
ALTER TABLE hr.leave_request DROP CONSTRAINT IF EXISTS fk_leave_request_leave_type_id;
DROP INDEX IF EXISTS hr.idx_leave_request_approved_by_id;
DROP INDEX IF EXISTS hr.idx_payroll_item_employee_id;
DROP INDEX IF EXISTS hr.idx_payroll_item_edited_by_id;
DROP INDEX IF EXISTS hr.idx_payroll_item_paid_by_id;
DROP INDEX IF EXISTS hr.idx_payroll_item_line_payroll_item_id;
ALTER TABLE hr.payroll_item_line DROP CONSTRAINT IF EXISTS fk_payroll_item_line_payroll_item_id;
DROP INDEX IF EXISTS hr.idx_payroll_item_line_recurring_id;
DROP INDEX IF EXISTS hr.idx_payroll_item_line_created_by_id;
DROP INDEX IF EXISTS hr.idx_payroll_run_approved_by;
DROP INDEX IF EXISTS hr.idx_payroll_run_approved_by_id;
DROP INDEX IF EXISTS hr.idx_retail_shift_branch_id;
DROP INDEX IF EXISTS hr.idx_retail_shift_opened_by_id;
DROP INDEX IF EXISTS hr.idx_retail_shift_closed_by_id;
DROP INDEX IF EXISTS hr.idx_salary_document_employee_id;
ALTER TABLE hr.salary_document DROP CONSTRAINT IF EXISTS fk_salary_document_employee_id;
DROP INDEX IF EXISTS hr.idx_salary_document_requested_by_id;
DROP INDEX IF EXISTS hr.idx_salary_document_reviewed_by_id;
