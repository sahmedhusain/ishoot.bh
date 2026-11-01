-- name: FindAccountByEmail :one
SELECT * FROM identity.account WHERE realm=$1 AND email=$2;
-- name: LockAccount :one
SELECT * FROM identity.account WHERE realm=$1 AND subject_id=$2 FOR UPDATE;
-- name: UpdateAccountHash :exec
UPDATE identity.account SET password_hash=$3, updated_at=$4 WHERE realm=$1 AND subject_id=$2;
-- name: SetAccountMFAStep :exec
UPDATE identity.account SET mfa_last_step=$3, updated_at=$4 WHERE realm=$1 AND subject_id=$2;
-- name: ConsumeAccountRecovery :execrows
UPDATE identity.mfa_recovery_code SET used_at=$4 WHERE realm=$1 AND subject_id=$2 AND code_hash=$3 AND used_at IS NULL;
-- name: SetAccountLastLogin :exec
UPDATE identity.account SET last_login_at=$3 WHERE realm=$1 AND subject_id=$2;

-- name: ActiveAccountSession :one
SELECT a.subject_id, a.roles FROM identity.account a
JOIN identity.session_family s ON s.realm=a.realm AND s.subject_id=a.subject_id
WHERE s.id=$1 AND s.realm=$2 AND s.revoked_at IS NULL AND s.expires_at>$3
 AND a.active AND (a.realm<>'it' OR a.mfa_enabled);
