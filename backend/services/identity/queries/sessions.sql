-- name: CreateSessionFamily :exec
INSERT INTO identity.session_family (id,subject_id,realm,expires_at) VALUES ($1,$2,$3,$4);
-- name: InsertRefreshRecord :exec
INSERT INTO identity.refresh_token (token_hash,family_id) VALUES ($1,$2);
-- name: FindRefreshFamily :one
SELECT f.id FROM identity.refresh_token t JOIN identity.session_family f ON f.id=t.family_id
WHERE t.token_hash=$1 AND f.realm=$2;
-- name: LockSessionFamily :one
SELECT * FROM identity.session_family WHERE id=$1 FOR UPDATE;
-- name: RefreshConsumedAt :one
SELECT consumed_at FROM identity.refresh_token WHERE token_hash=$1;
-- name: RevokeSessionFamily :exec
UPDATE identity.session_family SET revoked_at=$2 WHERE id=$1;
-- name: MarkRefreshConsumed :exec
UPDATE identity.refresh_token SET consumed_at=$2 WHERE token_hash=$1;
-- name: LogoutSessionFamily :exec
UPDATE identity.session_family SET revoked_at=COALESCE(revoked_at,$3)
WHERE realm=$1 AND id=(SELECT family_id FROM identity.refresh_token WHERE token_hash=$2);
-- name: ActiveSessionFamily :one
SELECT * FROM identity.session_family WHERE id=$1 AND realm=$2 AND revoked_at IS NULL AND expires_at>$3;

-- name: DeleteExpiredSessionFamilies :execrows
-- Consumed credentials must remain available for replay detection until the absolute family expiry.
DELETE FROM identity.session_family WHERE id IN (
 SELECT sf.id FROM identity.session_family AS sf WHERE sf.expires_at <= @cutoff
 ORDER BY sf.expires_at, sf.id LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
);
-- name: ReadSessionFamily :one
SELECT * FROM identity.session_family WHERE id=$1;
