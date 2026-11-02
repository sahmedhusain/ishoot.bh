-- name: ListAPIKeys :many
SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, created_by, created_at, revoked_at
FROM system.api_key
ORDER BY created_at DESC;

-- name: GetAPIKeyByHash :one
SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, revoked_at
FROM system.api_key
WHERE key_hash = $1;

-- name: InsertAPIKey :exec
INSERT INTO system.api_key (id, name, key_prefix, key_hash, scopes, rate_limit, expires_at, created_by, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: RevokeAPIKey :exec
UPDATE system.api_key
SET revoked_at = $2
WHERE id = $1 AND revoked_at IS NULL;

-- name: RecordAPIKeyUse :exec
UPDATE system.api_key
SET last_used_at = $2
WHERE id = $1;

-- name: ListBackupRecords :many
SELECT id, kind, file_name, file_size, checksum, status, error_message, created_by, created_at, verified_at, details
FROM system.backup_record
ORDER BY created_at DESC
LIMIT $1;

-- name: InsertBackupRecord :exec
INSERT INTO system.backup_record (id, kind, file_name, file_size, checksum, status, error_message, created_by, created_at, details)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);

-- name: UpdateBackupStatus :exec
UPDATE system.backup_record
SET status = $2, error_message = $3, verified_at = $4, details = $5
WHERE id = $1;

-- name: ListDebugToggles :many
SELECT id, service, log_level, enabled_by, enabled_at, expires_at
FROM system.debug_toggle
WHERE expires_at > now();

-- name: UpsertDebugToggle :exec
INSERT INTO system.debug_toggle (id, service, log_level, enabled_by, enabled_at, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (service) DO UPDATE
SET log_level = EXCLUDED.log_level, enabled_by = EXCLUDED.enabled_by, enabled_at = EXCLUDED.enabled_at, expires_at = EXCLUDED.expires_at;

-- name: DeleteDebugToggle :exec
DELETE FROM system.debug_toggle
WHERE service = $1;

-- name: DeleteExpiredDebugToggles :exec
DELETE FROM system.debug_toggle
WHERE expires_at <= now();
