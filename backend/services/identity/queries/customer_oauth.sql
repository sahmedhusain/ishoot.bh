-- name: StoreOAuthState :exec
INSERT INTO identity.oauth_state (state_hash,provider,redirect_uri,next_path,locale,secret_encrypted,expires_at)
VALUES ($1,$2,$3,$4,$5,$6,$7);
-- name: LockOAuthState :one
SELECT * FROM identity.oauth_state WHERE state_hash=$1 FOR UPDATE;
-- name: ClaimOAuthExchange :exec
UPDATE identity.oauth_state SET exchanging_at=$2 WHERE state_hash=$1;
-- name: StoreOAuthClaims :exec
UPDATE identity.oauth_state SET claims_encrypted=$2 WHERE state_hash=$1 AND consumed_at IS NULL;
-- name: ConsumeOAuthState :exec
UPDATE identity.oauth_state SET consumed_at=$2 WHERE state_hash=$1;
-- name: FindProviderCustomer :one
SELECT a.* FROM identity.customer_provider p JOIN identity.account a ON a.realm=p.realm AND a.subject_id=p.subject_id
WHERE p.provider=$1 AND p.provider_subject=$2;
-- name: LinkCustomerProvider :exec
INSERT INTO identity.customer_provider(provider,provider_subject,subject_id) VALUES ($1,$2,$3)
ON CONFLICT(provider,subject_id) DO UPDATE SET provider_subject=EXCLUDED.provider_subject;
-- name: DeleteExpiredOAuthStates :execrows
DELETE FROM identity.oauth_state WHERE state_hash IN (
 SELECT os.state_hash FROM identity.oauth_state os WHERE os.expires_at <= @cutoff ORDER BY os.expires_at,os.state_hash
 LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
);
