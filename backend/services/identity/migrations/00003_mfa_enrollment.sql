-- +goose Up
ALTER TABLE identity.account
 ADD COLUMN mfa_pending_secret_encrypted text,
 ADD COLUMN mfa_pending_expires_at timestamptz,
 ADD CONSTRAINT mfa_pending_complete CHECK ((mfa_pending_secret_encrypted IS NULL) = (mfa_pending_expires_at IS NULL));

-- +goose Down
ALTER TABLE identity.account DROP CONSTRAINT mfa_pending_complete,
 DROP COLUMN mfa_pending_secret_encrypted, DROP COLUMN mfa_pending_expires_at;
