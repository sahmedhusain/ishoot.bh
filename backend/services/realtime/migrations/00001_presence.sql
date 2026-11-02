-- People's statuses (ADR 0012): the one each person chose, and the time windows (calendar meetings, approved leave)
-- the apps that own those records send. Live connections are not stored here; they live in Valkey.
-- pkg/migrate creates the schema (the service's own login owns it but may not create schemas).

-- +goose Up
CREATE TABLE IF NOT EXISTS realtime.status (
    realm      text        NOT NULL,
    user_id    text        NOT NULL,
    status     text        NOT NULL,
    message    text,
    expires_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT status_pkey PRIMARY KEY (realm, user_id),
    CONSTRAINT status_realm_check CHECK (realm IN ('staff', 'it'))
);
CREATE INDEX IF NOT EXISTS status_expires_idx ON realtime.status (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS realtime.status_window (
    id         uuid        NOT NULL,
    realm      text        NOT NULL,
    user_id    text        NOT NULL,
    source     text        NOT NULL,
    source_id  text        NOT NULL,
    kind       text        NOT NULL,
    starts_at  timestamptz NOT NULL,
    ends_at    timestamptz NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT status_window_pkey PRIMARY KEY (id),
    CONSTRAINT status_window_source UNIQUE (realm, user_id, source, source_id),
    CONSTRAINT status_window_realm_check CHECK (realm IN ('staff', 'it')),
    CONSTRAINT status_window_order_check CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS status_window_user_idx ON realtime.status_window (realm, user_id, ends_at);
CREATE INDEX IF NOT EXISTS status_window_source_idx ON realtime.status_window (realm, source, source_id);
CREATE INDEX IF NOT EXISTS status_window_starts_idx ON realtime.status_window (starts_at);
CREATE INDEX IF NOT EXISTS status_window_ends_idx ON realtime.status_window (ends_at);

-- +goose Down
DROP TABLE IF EXISTS realtime.status_window;
DROP TABLE IF EXISTS realtime.status;
