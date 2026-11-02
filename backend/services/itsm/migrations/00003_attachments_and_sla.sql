-- +goose Up
-- Associates attachments with comments when uploaded during a conversation reply or note,
-- and tracks SLA reminder scheduling.

ALTER TABLE itsm.ticket_attachment
    ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES itsm.ticket_comment (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ticket_attachment_comment ON itsm.ticket_attachment (comment_id) WHERE comment_id IS NOT NULL;

ALTER TABLE itsm.ticket
    ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

CREATE INDEX IF NOT EXISTS ticket_sla_respond ON itsm.ticket (respond_by)
    WHERE first_response_at IS NULL AND breached_at IS NULL AND closed_at IS NULL;

CREATE INDEX IF NOT EXISTS ticket_sla_reminder ON itsm.ticket (resolve_by, respond_by)
    WHERE reminded_at IS NULL AND breached_at IS NULL AND closed_at IS NULL AND resolved_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS itsm.ticket_sla_reminder;
DROP INDEX IF EXISTS itsm.ticket_sla_respond;
ALTER TABLE itsm.ticket DROP COLUMN IF EXISTS reminded_at;
DROP INDEX IF EXISTS itsm.ticket_attachment_comment;
ALTER TABLE itsm.ticket_attachment DROP COLUMN IF EXISTS comment_id;
