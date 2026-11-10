-- +goose Up
CREATE TABLE IF NOT EXISTS workflow.approval_request (
    id text PRIMARY KEY,
    kind text NOT NULL,
    entity_id text NOT NULL,
    requester_id text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    priority text NOT NULL DEFAULT 'normal',
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_kind_entity_idx ON workflow.approval_request (kind, entity_id);
CREATE INDEX IF NOT EXISTS approval_status_idx ON workflow.approval_request (status);
CREATE TABLE IF NOT EXISTS workflow.approval_decision (
    id text PRIMARY KEY,
    request_id text NOT NULL REFERENCES workflow.approval_request(id) ON DELETE CASCADE,
    approver_id text NOT NULL,
    decision text NOT NULL,
    comments text,
    decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decision_request_idx ON workflow.approval_decision (request_id);
CREATE TABLE IF NOT EXISTS workflow.signature_request (
    id text PRIMARY KEY,
    title text NOT NULL,
    document_type text NOT NULL,
    document_id text NOT NULL,
    requested_from text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    signature_url text,
    signed_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sig_req_doc_idx ON workflow.signature_request (document_type, document_id);
CREATE TABLE IF NOT EXISTS workflow.letter_template (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    template_body text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS workflow.official_letter (
    id text PRIMARY KEY,
    letter_number text NOT NULL UNIQUE,
    template_id text REFERENCES workflow.letter_template(id) ON DELETE SET NULL,
    recipient_name text NOT NULL,
    recipient_title text,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    issued_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workflow.minute_of_meeting (
    id text PRIMARY KEY,
    mom_number text NOT NULL UNIQUE,
    title text NOT NULL,
    meeting_date date NOT NULL DEFAULT current_date,
    attendees text[] NOT NULL DEFAULT '{}',
    discussion text NOT NULL,
    action_items text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workflow.task (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text,
    assigned_to text,
    due_date date,
    status text NOT NULL DEFAULT 'todo',
    priority text NOT NULL DEFAULT 'normal',
    related_entity_type text,
    related_entity_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_assignee_status_idx ON workflow.task (assigned_to, status);
CREATE TABLE IF NOT EXISTS workflow.calendar_event (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    is_all_day boolean NOT NULL DEFAULT false,
    location text,
    organizer_id text NOT NULL,
    event_type text NOT NULL DEFAULT 'general',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cal_time_idx ON workflow.calendar_event (start_time, end_time);

-- +goose Down
DROP TABLE IF EXISTS workflow.calendar_event;
DROP TABLE IF EXISTS workflow.task;
DROP TABLE IF EXISTS workflow.minute_of_meeting;
DROP TABLE IF EXISTS workflow.official_letter;
DROP TABLE IF EXISTS workflow.letter_template;
DROP TABLE IF EXISTS workflow.signature_request;
DROP TABLE IF EXISTS workflow.approval_decision;
DROP TABLE IF EXISTS workflow.approval_request;
