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
