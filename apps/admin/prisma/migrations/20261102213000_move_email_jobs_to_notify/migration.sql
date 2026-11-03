-- Move legacy EmailJob into notify.message
CREATE SCHEMA IF NOT EXISTS notify;

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

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'EmailJob') THEN
        INSERT INTO notify.message (
            id, caller, idempotency_key, actor, channel, recipient, subject,
            body_html, status, attempts, provider_id, last_error, created_at, updated_at, sent_at
        )
        SELECT
            e.id::uuid,
            'legacy:email-job',
            e."eventKey",
            CASE WHEN e."createdById" IS NOT NULL THEN 'staff:' || e."createdById" ELSE NULL END,
            'email',
            e.recipient,
            e.subject,
            e.html,
            CASE
                WHEN e.status = 'sent' THEN 'sent'
                WHEN e.status = 'failed' THEN 'failed'
                ELSE 'queued'
            END,
            e.attempts,
            e."providerId",
            e."lastError",
            e."createdAt" AT TIME ZONE 'UTC',
            COALESCE(e."acceptedAt" AT TIME ZONE 'UTC', e."createdAt" AT TIME ZONE 'UTC'),
            CASE WHEN e.status = 'sent' THEN COALESCE(e."acceptedAt" AT TIME ZONE 'UTC', e."createdAt" AT TIME ZONE 'UTC') ELSE NULL END
        FROM public."EmailJob" e
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
