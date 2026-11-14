-- +goose Up
CREATE INDEX IF NOT EXISTS idx_approval_decision_approver_id ON workflow.approval_decision (approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_entity_id ON workflow.approval_request (entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_requester_id ON workflow.approval_request (requester_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_organizer_id ON workflow.calendar_event (organizer_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON workflow.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_official_letter_template_id ON workflow.official_letter (template_id);
CREATE INDEX IF NOT EXISTS idx_signature_request_document_id ON workflow.signature_request (document_id);
CREATE INDEX IF NOT EXISTS idx_task_related_entity_id ON workflow.task (related_entity_id);
CREATE INDEX IF NOT EXISTS idx_mom_date_status ON workflow.minute_of_meeting (meeting_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_task_assigned_status ON workflow.task (assigned_to, status);

-- +goose Down
DROP INDEX IF EXISTS workflow.idx_approval_decision_approver_id;
DROP INDEX IF EXISTS workflow.idx_approval_request_entity_id;
DROP INDEX IF EXISTS workflow.idx_approval_request_requester_id;
DROP INDEX IF EXISTS workflow.idx_calendar_event_organizer_id;
DROP INDEX IF EXISTS workflow.idx_inbox_event_id;
DROP INDEX IF EXISTS workflow.idx_official_letter_template_id;
DROP INDEX IF EXISTS workflow.idx_signature_request_document_id;
DROP INDEX IF EXISTS workflow.idx_task_related_entity_id;
DROP INDEX IF EXISTS workflow.idx_mom_date_status;
DROP INDEX IF EXISTS workflow.idx_task_assigned_status;
