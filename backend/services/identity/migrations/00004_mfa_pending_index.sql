CREATE INDEX account_mfa_pending_expiry ON identity.account (mfa_pending_expires_at) WHERE mfa_pending_expires_at IS NOT NULL;
DROP INDEX identity.account_mfa_pending_expiry;
