-- +goose Up
CREATE TABLE IF NOT EXISTS system.api_key (
    id text PRIMARY KEY,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    scopes text[] NOT NULL DEFAULT '{}',
    rate_limit int NOT NULL DEFAULT 60,
    last_used_at timestamptz,
    expires_at timestamptz,
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS api_key_created_idx ON system.api_key (created_at DESC);
CREATE TABLE IF NOT EXISTS system.backup_record (
    id text PRIMARY KEY,
    kind text NOT NULL CHECK(kind IN ('database','bucket','full')),
    file_name text NOT NULL,
    file_size bigint NOT NULL DEFAULT 0,
    checksum text NOT NULL DEFAULT '',
    status text NOT NULL CHECK(status IN ('completed','failed','verifying','verified')),
    error_message text,
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS backup_record_created_idx ON system.backup_record (created_at DESC);
CREATE TABLE IF NOT EXISTS system.debug_toggle (
    id text PRIMARY KEY,
    service text NOT NULL UNIQUE,
    log_level text NOT NULL DEFAULT 'debug',
    enabled_by text NOT NULL,
    enabled_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS system.debug_toggle;
DROP TABLE IF EXISTS system.backup_record;
DROP TABLE IF EXISTS system.api_key;
