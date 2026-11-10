ALTER TABLE identity.account ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS account_realm_username_idx ON identity.account (realm, lower(username)) WHERE username IS NOT NULL;
DROP INDEX IF EXISTS identity.account_realm_username_idx;
ALTER TABLE identity.account DROP COLUMN IF EXISTS username;
