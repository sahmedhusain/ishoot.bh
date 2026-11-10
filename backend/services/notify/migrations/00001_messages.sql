-- +goose Up
CREATE TABLE IF NOT EXISTS notify.message (
    id              uuid        NOT NULL,
    caller          text        NOT NULL,
    idempotency_key text        NOT NULL,
    actor           text,
    channel         text        NOT NULL,
    recipient       text        NOT NULL,
    subject         text,
    body_text       text,
    body_html       text,
    status          text        NOT NULL DEFAULT 'queued',
    attempts        integer     NOT NULL DEFAULT 0,
    provider        text,
    provider_id     text,
    last_error      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    sent_at         timestamptz,
    CONSTRAINT message_pkey PRIMARY KEY (id),
    CONSTRAINT message_idempotency_key UNIQUE (caller, idempotency_key),
    CONSTRAINT message_channel_check CHECK (channel IN ('email', 'whatsapp')),
    CONSTRAINT message_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);
CREATE INDEX IF NOT EXISTS message_created_idx ON notify.message (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS message_status_idx ON notify.message (status, created_at DESC);
CREATE TABLE IF NOT EXISTS notify.attachment (
    message_id   uuid    NOT NULL REFERENCES notify.message (id) ON DELETE CASCADE,
    position     integer NOT NULL,
    filename     text    NOT NULL,
    content_type text    NOT NULL,
    content      bytea   NOT NULL,
    CONSTRAINT attachment_pkey PRIMARY KEY (message_id, position)
);

-- +goose Down
DROP TABLE IF EXISTS notify.attachment;
DROP TABLE IF EXISTS notify.message;
