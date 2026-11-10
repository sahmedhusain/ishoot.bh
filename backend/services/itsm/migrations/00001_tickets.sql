-- +goose Up
CREATE SEQUENCE itsm.ticket_number_seq;
CREATE TABLE itsm.sla_policy (
    priority         text PRIMARY KEY,
    response_minutes integer NOT NULL CHECK (response_minutes > 0),
    resolve_minutes  integer NOT NULL CHECK (resolve_minutes >= response_minutes),
    updated_by       text,
    updated_at       timestamptz NOT NULL DEFAULT now()
);
INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes) VALUES
    ('critical', 30, 240), ('high', 120, 1440), ('normal', 480, 4320), ('low', 1440, 10080);
CREATE TABLE itsm.ticket (
    id                uuid PRIMARY KEY,
    number            bigint NOT NULL UNIQUE DEFAULT nextval('itsm.ticket_number_seq'),
    requester_id      text NOT NULL,
    requester_name    text NOT NULL,
    requester_email   text NOT NULL,
    category          text NOT NULL,
    subcategory       text NOT NULL,
    priority          text NOT NULL,
    status            text NOT NULL,
    title             text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    description       text NOT NULL CHECK (length(description) BETWEEN 1 AND 10000),
    asset_ref         text,
    assignee_id       text,
    assignee_name     text,
    respond_by        timestamptz NOT NULL,
    resolve_by        timestamptz NOT NULL,
    first_response_at timestamptz,
    breached_at       timestamptz,
    resolved_at       timestamptz,
    closed_at         timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_requester ON itsm.ticket (requester_id, created_at DESC, id DESC);
CREATE INDEX ticket_queue ON itsm.ticket (status, created_at DESC, id DESC);
CREATE INDEX ticket_assignee ON itsm.ticket (assignee_id, created_at DESC) WHERE assignee_id IS NOT NULL;
CREATE INDEX ticket_sla_open ON itsm.ticket (resolve_by) WHERE breached_at IS NULL AND resolved_at IS NULL AND closed_at IS NULL;
CREATE TABLE itsm.ticket_event (
    id          uuid PRIMARY KEY,
    ticket_id   uuid NOT NULL REFERENCES itsm.ticket (id) ON DELETE CASCADE,
    actor_realm text NOT NULL,
    actor_id    text NOT NULL,
    kind        text NOT NULL,
    from_status text,
    to_status   text,
    detail      jsonb NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_event_ticket ON itsm.ticket_event (ticket_id, created_at);
CREATE TABLE itsm.ticket_comment (
    id          uuid PRIMARY KEY,
    ticket_id   uuid NOT NULL REFERENCES itsm.ticket (id) ON DELETE CASCADE,
    author_realm text NOT NULL,
    author_id   text NOT NULL,
    author_name text NOT NULL,
    body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
    internal    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_comment_ticket ON itsm.ticket_comment (ticket_id, created_at);
CREATE TABLE itsm.ticket_attachment (
    ticket_id  uuid NOT NULL REFERENCES itsm.ticket (id) ON DELETE CASCADE,
    file_url   text NOT NULL,
    file_name  text NOT NULL,
    mime_type  text NOT NULL,
    file_size  bigint NOT NULL,
    added_by   text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (ticket_id, file_url)
);

-- +goose Down
DROP TABLE itsm.ticket_attachment;
DROP TABLE itsm.ticket_comment;
DROP TABLE itsm.ticket_event;
DROP TABLE itsm.ticket;
DROP TABLE itsm.sla_policy;
DROP SEQUENCE itsm.ticket_number_seq;
