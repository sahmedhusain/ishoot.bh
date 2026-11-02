-- +goose Up
CREATE TABLE IF NOT EXISTS identity.customer_code (
 email text PRIMARY KEY,
 id text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
 hash_kind text NOT NULL DEFAULT 'hmac' CHECK (hash_kind IN ('hmac', 'sha256')),
 code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE INDEX IF NOT EXISTS customer_code_expiry_idx ON identity.customer_code(expires_at);
-- +goose Down
DROP TABLE identity.customer_code;
