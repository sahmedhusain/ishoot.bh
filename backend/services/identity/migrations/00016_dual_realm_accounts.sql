-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT c.conname INTO con_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'identity'
      AND t.relname = 'password_reset'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%realm%';
    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE identity.password_reset DROP CONSTRAINT %I', con_name);
    END IF;
END $$;
-- +goose StatementEnd

ALTER TABLE identity.password_reset
    ADD CONSTRAINT password_reset_realm_check CHECK (realm IN ('staff', 'customer', 'it'));

CREATE UNIQUE INDEX IF NOT EXISTS account_realm_lower_email_idx
    ON identity.account (realm, lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS account_realm_username_idx
    ON identity.account (realm, lower(username))
    WHERE username IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS identity.account_realm_lower_email_idx;
ALTER TABLE identity.password_reset DROP CONSTRAINT IF EXISTS password_reset_realm_check;
ALTER TABLE identity.password_reset
    ADD CONSTRAINT password_reset_realm_check CHECK (realm IN ('staff', 'customer'));
