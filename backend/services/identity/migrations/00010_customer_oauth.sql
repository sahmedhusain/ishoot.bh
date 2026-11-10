-- +goose Up
CREATE TABLE IF NOT EXISTS identity.oauth_state (
 state_hash text PRIMARY KEY CHECK (state_hash ~ '^[a-f0-9]{64}$'),
 provider text NOT NULL CHECK (provider IN ('google','apple')),
 redirect_uri text NOT NULL,
 next_path text NOT NULL,
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 secret_encrypted text NOT NULL,
 claims_encrypted text,
 exchanging_at timestamptz,
 consumed_at timestamptz,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_state_expiry_idx ON identity.oauth_state(expires_at);
CREATE TABLE IF NOT EXISTS identity.customer_provider (
 provider text NOT NULL CHECK (provider IN ('google','apple')),
 provider_subject text NOT NULL,
 realm text NOT NULL DEFAULT 'customer' CHECK (realm='customer'),
 subject_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,provider_subject),
 UNIQUE(provider,subject_id),
 FOREIGN KEY(realm,subject_id) REFERENCES identity.account(realm,subject_id) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE identity.customer_provider;
DROP TABLE identity.oauth_state;
