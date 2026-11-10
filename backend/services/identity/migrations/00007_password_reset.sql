CREATE TABLE identity.password_reset (
 token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 realm text NOT NULL CHECK (realm IN ('staff', 'customer')),
 subject_id text NOT NULL,
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (realm, subject_id) REFERENCES identity.account(realm, subject_id) ON DELETE CASCADE
);
CREATE INDEX password_reset_subject_idx ON identity.password_reset (realm, subject_id);
DROP TABLE identity.password_reset;
