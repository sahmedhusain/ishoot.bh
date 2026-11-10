CREATE TABLE IF NOT EXISTS identity.legacy_reset_challenge (
 id text PRIMARY KEY,
 realm text NOT NULL DEFAULT 'staff' CHECK(realm='staff'),
 subject_id text NOT NULL,
 code_hash text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('password_reset','invitation')),
 used_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL,
 FOREIGN KEY(realm,subject_id) REFERENCES identity.account(realm,subject_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS legacy_reset_subject_idx ON identity.legacy_reset_challenge(subject_id);
DROP TABLE identity.legacy_reset_challenge;
