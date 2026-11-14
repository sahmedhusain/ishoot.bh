-- +goose Up
CREATE INDEX IF NOT EXISTS idx_asset_category_id ON itsm.asset (category_id);
CREATE INDEX IF NOT EXISTS idx_asset_handover_asset_id ON itsm.asset_handover (asset_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_asset_handover_asset_id' AND conrelid = 'itsm.asset_handover'::regclass) THEN
        DELETE FROM itsm.asset_handover WHERE asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM itsm.asset p WHERE p.id = itsm.asset_handover.asset_id);
        ALTER TABLE itsm.asset_handover ADD CONSTRAINT fk_asset_handover_asset_id FOREIGN KEY (asset_id) REFERENCES itsm.asset(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_asset_handover_employee_id ON itsm.asset_handover (employee_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON itsm.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_support_program_rule_program_id ON itsm.support_program_rule (program_id);
CREATE INDEX IF NOT EXISTS idx_support_reimbursement_employee_id ON itsm.support_reimbursement (employee_id);
CREATE INDEX IF NOT EXISTS idx_support_reimbursement_recorded_by_id ON itsm.support_reimbursement (recorded_by_id);
CREATE INDEX IF NOT EXISTS idx_task_project_id ON itsm.task (project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_id ON itsm.task (assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_department_id ON itsm.task (department_id);
CREATE INDEX IF NOT EXISTS idx_task_link_id ON itsm.task (link_id);
CREATE INDEX IF NOT EXISTS idx_task_created_by_id ON itsm.task (created_by_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_task_id ON itsm.task_comment (task_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_comment_task_id' AND conrelid = 'itsm.task_comment'::regclass) THEN
        DELETE FROM itsm.task_comment WHERE task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM itsm.task p WHERE p.id = itsm.task_comment.task_id);
        ALTER TABLE itsm.task_comment ADD CONSTRAINT fk_task_comment_task_id FOREIGN KEY (task_id) REFERENCES itsm.task(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_task_comment_author_id ON itsm.task_comment (author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachment_ticket_id ON itsm.ticket_attachment (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comment_author_id ON itsm.ticket_comment (author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_event_actor_id ON itsm.ticket_event (actor_id);

-- +goose Down
DROP INDEX IF EXISTS itsm.idx_asset_category_id;
DROP INDEX IF EXISTS itsm.idx_asset_handover_asset_id;
ALTER TABLE itsm.asset_handover DROP CONSTRAINT IF EXISTS fk_asset_handover_asset_id;
DROP INDEX IF EXISTS itsm.idx_asset_handover_employee_id;
DROP INDEX IF EXISTS itsm.idx_inbox_event_id;
DROP INDEX IF EXISTS itsm.idx_support_program_rule_program_id;
DROP INDEX IF EXISTS itsm.idx_support_reimbursement_employee_id;
DROP INDEX IF EXISTS itsm.idx_support_reimbursement_recorded_by_id;
DROP INDEX IF EXISTS itsm.idx_task_project_id;
DROP INDEX IF EXISTS itsm.idx_task_assignee_id;
DROP INDEX IF EXISTS itsm.idx_task_department_id;
DROP INDEX IF EXISTS itsm.idx_task_link_id;
DROP INDEX IF EXISTS itsm.idx_task_created_by_id;
DROP INDEX IF EXISTS itsm.idx_task_comment_task_id;
ALTER TABLE itsm.task_comment DROP CONSTRAINT IF EXISTS fk_task_comment_task_id;
DROP INDEX IF EXISTS itsm.idx_task_comment_author_id;
DROP INDEX IF EXISTS itsm.idx_ticket_attachment_ticket_id;
DROP INDEX IF EXISTS itsm.idx_ticket_comment_author_id;
DROP INDEX IF EXISTS itsm.idx_ticket_event_actor_id;
