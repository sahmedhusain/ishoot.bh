CREATE TABLE IF NOT EXISTS "cms".outbox (
    id           uuid        NOT NULL,
    subject      text        NOT NULL,
    payload      jsonb       NOT NULL,
    headers      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    attempts     integer     NOT NULL DEFAULT 0,
    next_try_at  timestamptz NOT NULL DEFAULT now(),
    last_error   text,
    CONSTRAINT outbox_pkey PRIMARY KEY (id),
    CONSTRAINT outbox_subject_check CHECK (subject ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON "cms".outbox (next_try_at) WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS outbox_published_idx ON "cms".outbox (published_at) WHERE published_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS "cms".inbox (
    consumer   text        NOT NULL,
    event_id   uuid        NOT NULL,
    handled_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT inbox_pkey PRIMARY KEY (consumer, event_id)
);
DROP TABLE IF EXISTS "cms".inbox;
DROP TABLE IF EXISTS "cms".outbox;
