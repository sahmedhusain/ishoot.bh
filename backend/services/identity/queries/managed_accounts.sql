-- name: UpsertManagedAccount :exec
INSERT INTO identity.account (realm,subject_id,email,roles,active,created_at,updated_at)
VALUES (@realm,@subject_id,@email,@roles::text[],@active,@now,@now)
ON CONFLICT (realm,subject_id) DO UPDATE SET email=EXCLUDED.email,roles=EXCLUDED.roles,active=EXCLUDED.active,updated_at=EXCLUDED.updated_at;
-- name: FindActiveAccountByEmail :one
SELECT subject_id FROM identity.account WHERE realm=$1 AND email=$2 AND active;
-- name: RevokeOtherSubjectSessions :exec
UPDATE identity.session_family SET revoked_at=COALESCE(revoked_at,@revoked_at)
WHERE realm= @realm AND subject_id= @subject_id AND id<> @keep_id;
-- name: DeleteOpenPasswordResets :exec
DELETE FROM identity.password_reset WHERE realm=$1 AND subject_id=$2 AND used_at IS NULL;
-- name: InsertPasswordReset :exec
INSERT INTO identity.password_reset(token_hash,realm,subject_id,expires_at,created_at) VALUES ($1,$2,$3,$4,$5);
-- name: ConsumePasswordReset :one
UPDATE identity.password_reset SET used_at= @now
WHERE token_hash= @token_hash AND realm= @realm AND used_at IS NULL AND expires_at> @now
RETURNING subject_id;
-- name: PasswordResetSubject :one
SELECT subject_id FROM identity.password_reset WHERE token_hash=$1 AND realm=$2 AND used_at IS NULL AND expires_at>now();
-- name: CountActiveStaffAdmins :one
SELECT count(*) FROM identity.account WHERE realm='staff' AND active AND password_hash IS NOT NULL AND roles @> ARRAY['super_admin']::text[];
-- name: LockLegacyResetChallenges :many
SELECT * FROM identity.legacy_reset_challenge
WHERE subject_id=$1 AND used_at IS NULL AND attempts<3 AND expires_at>now() ORDER BY created_at DESC,id DESC LIMIT 100 FOR UPDATE;
-- name: FailLegacyResetChallenge :exec
UPDATE identity.legacy_reset_challenge SET attempts=LEAST(attempts+1,3) WHERE id=$1;
-- name: CancelLegacyResetChallenges :exec
UPDATE identity.legacy_reset_challenge SET used_at=COALESCE(used_at,now()) WHERE realm=$1 AND subject_id=$2;
-- name: DeleteExpiredLegacyResetChallenges :execrows
DELETE FROM identity.legacy_reset_challenge WHERE id IN (
 SELECT lc.id FROM identity.legacy_reset_challenge lc WHERE lc.expires_at<= @cutoff ORDER BY lc.expires_at,lc.id
 LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
);
-- name: EnsureStaffAccess :exec
INSERT INTO identity.staff_access(subject_id,updated_at) VALUES ($1,now()) ON CONFLICT(realm,subject_id) DO NOTHING;
