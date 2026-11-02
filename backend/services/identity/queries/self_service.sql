-- name: SetSessionDevice :exec
UPDATE identity.session_family SET user_agent = @user_agent, client_ip = @client_ip WHERE id = @id;
-- name: ListOwnSessions :many
SELECT id, created_at, expires_at, user_agent, client_ip FROM identity.session_family
WHERE realm = @realm AND subject_id = @subject_id AND revoked_at IS NULL AND expires_at > @now
ORDER BY created_at DESC LIMIT 50;
-- name: RevokeOwnSession :execrows
UPDATE identity.session_family SET revoked_at = COALESCE(revoked_at, @now)
WHERE id = @id AND realm = @realm AND subject_id = @subject_id AND revoked_at IS NULL;
-- name: OwnAccountSecurity :one
SELECT a.email, a.mfa_enabled, (a.password_hash IS NOT NULL)::boolean AS has_password,
 EXISTS(SELECT 1 FROM identity.customer_provider p WHERE p.realm=a.realm AND p.subject_id=a.subject_id AND p.provider='google')::boolean AS google,
 EXISTS(SELECT 1 FROM identity.customer_provider p WHERE p.realm=a.realm AND p.subject_id=a.subject_id AND p.provider='apple')::boolean AS apple,
 (SELECT count(*) FROM identity.mfa_recovery_code r WHERE r.realm = a.realm AND r.subject_id = a.subject_id AND r.used_at IS NULL)::bigint AS recovery_codes_left
FROM identity.account a WHERE a.realm = @realm AND a.subject_id = @subject_id;

-- name: RevokeOwnOtherSessions :many
UPDATE identity.session_family SET revoked_at = @now
WHERE realm = @realm AND subject_id = @subject_id AND id <> @keep_id
 AND revoked_at IS NULL AND expires_at > @now
RETURNING id;

-- name: DeleteOwnCustomerAccount :exec
DELETE FROM identity.account WHERE realm='customer' AND subject_id=$1;
