-- +goose Up
CREATE TABLE identity.session_family (
 id uuid PRIMARY KEY,
 subject_id text NOT NULL,
 realm text NOT NULL CHECK (realm IN ('staff','customer','it')),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_family_subject ON identity.session_family (realm, subject_id);
CREATE INDEX session_family_expiry ON identity.session_family (expires_at);
CREATE TABLE identity.refresh_token (
 token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 family_id uuid NOT NULL REFERENCES identity.session_family(id) ON DELETE CASCADE,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_token_family ON identity.refresh_token (family_id);

-- +goose Down
DROP TABLE identity.refresh_token;
DROP TABLE identity.session_family;
