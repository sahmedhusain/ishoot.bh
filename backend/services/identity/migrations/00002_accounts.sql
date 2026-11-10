-- +goose Up
CREATE TABLE identity.account (
 realm text NOT NULL CHECK (realm IN ('staff', 'customer', 'it')),
 subject_id text NOT NULL CHECK (length(subject_id) > 0),
 email text NOT NULL CHECK (length(email) BETWEEN 1 AND 254),
 password_hash text,
 roles text[] NOT NULL DEFAULT '{}',
 active boolean NOT NULL DEFAULT true,
 mfa_enabled boolean NOT NULL DEFAULT false,
 mfa_secret_encrypted text,
 mfa_last_step bigint,
 last_login_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (realm, subject_id),
 UNIQUE (realm, email),
 CHECK (NOT mfa_enabled OR mfa_secret_encrypted IS NOT NULL)
);
CREATE TABLE identity.mfa_recovery_code (
 realm text NOT NULL,
 subject_id text NOT NULL,
 code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
 used_at timestamptz,
 PRIMARY KEY (realm, subject_id, code_hash),
 FOREIGN KEY (realm, subject_id) REFERENCES identity.account(realm, subject_id) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE identity.mfa_recovery_code;
DROP TABLE identity.account;
