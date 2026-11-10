-- +goose Up
CREATE TABLE IF NOT EXISTS audit.event (
    id          uuid        NOT NULL,
    subject     text        NOT NULL,
    service     text        NOT NULL,
    entity      text        NOT NULL,
    verb        text        NOT NULL,
    actor       text,
    occurred_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    payload     jsonb       NOT NULL,
    trace_id    text,
    CONSTRAINT event_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS event_occurred_idx ON audit.event (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS event_subject_idx ON audit.event (subject, occurred_at DESC);
CREATE INDEX IF NOT EXISTS event_service_idx ON audit.event (service, occurred_at DESC);
CREATE INDEX IF NOT EXISTS event_actor_idx ON audit.event (actor, occurred_at DESC) WHERE actor IS NOT NULL;
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION audit.reject_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit events are append-only' USING ERRCODE = 'insufficient_privilege';
END
$$;
-- +goose StatementEnd
DROP TRIGGER IF EXISTS event_append_only ON audit.event;
CREATE TRIGGER event_append_only BEFORE UPDATE OR DELETE ON audit.event
    FOR EACH ROW EXECUTE FUNCTION audit.reject_change();
DROP TRIGGER IF EXISTS event_no_truncate ON audit.event;
CREATE TRIGGER event_no_truncate BEFORE TRUNCATE ON audit.event
    FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_change();

-- +goose Down
DROP TABLE IF EXISTS audit.event;
DROP FUNCTION IF EXISTS audit.reject_change();
