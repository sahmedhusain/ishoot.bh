-- +goose Up
CREATE TABLE IF NOT EXISTS notify.notification (
    id             uuid        NOT NULL,
    realm          text        NOT NULL,
    recipient      text        NOT NULL,
    category       text        NOT NULL,
    priority       text        NOT NULL DEFAULT 'normal',
    title          text        NOT NULL,
    body           text        NOT NULL DEFAULT '',
    message_key    text,
    message_params jsonb       NOT NULL DEFAULT '{}'::jsonb,
    action_url     text,
    entity_type    text,
    entity_id      text,
    actor          text,
    caller         text        NOT NULL,
    dedupe_key     text,
    silent         boolean     NOT NULL DEFAULT false,
    deliver_at     timestamptz NOT NULL DEFAULT now(),
    read_at        timestamptz,
    archived_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT notification_pkey PRIMARY KEY (id),
    CONSTRAINT notification_dedupe UNIQUE (realm, recipient, dedupe_key),
    CONSTRAINT notification_realm_check CHECK (realm IN ('staff', 'it')),
    CONSTRAINT notification_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);
CREATE INDEX IF NOT EXISTS notification_inbox_idx ON notify.notification (realm, recipient, deliver_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS notification_unread_idx ON notify.notification (realm, recipient, category)
    WHERE read_at IS NULL AND archived_at IS NULL AND NOT silent;
CREATE INDEX IF NOT EXISTS notification_created_idx ON notify.notification (created_at);
CREATE TABLE IF NOT EXISTS notify.preference (
    realm           text        NOT NULL,
    user_id         text        NOT NULL,
    muted_until     timestamptz,
    sound_enabled   boolean     NOT NULL DEFAULT true,
    sound           text        NOT NULL DEFAULT 'chime',
    volume          smallint    NOT NULL DEFAULT 70,
    popups_enabled  boolean     NOT NULL DEFAULT true,
    desktop_enabled boolean     NOT NULL DEFAULT false,
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT preference_pkey PRIMARY KEY (realm, user_id),
    CONSTRAINT preference_volume_check CHECK (volume BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS notify.category_setting (
    realm    text    NOT NULL,
    user_id  text    NOT NULL,
    category text    NOT NULL,
    muted    boolean NOT NULL DEFAULT false,
    sound    boolean NOT NULL DEFAULT true,
    CONSTRAINT category_setting_pkey PRIMARY KEY (realm, user_id, category)
);
CREATE TABLE IF NOT EXISTS notify.mute (
    realm       text        NOT NULL,
    user_id     text        NOT NULL,
    entity_type text        NOT NULL,
    entity_id   text        NOT NULL,
    until       timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mute_pkey PRIMARY KEY (realm, user_id, entity_type, entity_id)
);

-- +goose Down
DROP TABLE IF EXISTS notify.mute;
DROP TABLE IF EXISTS notify.category_setting;
DROP TABLE IF EXISTS notify.preference;
DROP TABLE IF EXISTS notify.notification;
