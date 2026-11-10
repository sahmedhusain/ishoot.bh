SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, created_by, created_at, revoked_at
FROM system.api_key
ORDER BY created_at DESC;
SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, revoked_at
FROM system.api_key
WHERE key_hash = $1;
INSERT INTO system.api_key (id, name, key_prefix, key_hash, scopes, rate_limit, expires_at, created_by, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
UPDATE system.api_key
SET revoked_at = $2
WHERE id = $1 AND revoked_at IS NULL;
UPDATE system.api_key
SET last_used_at = $2
WHERE id = $1;
SELECT id, kind, file_name, file_size, checksum, status, error_message, created_by, created_at, verified_at, details
FROM system.backup_record
ORDER BY created_at DESC
LIMIT $1;
INSERT INTO system.backup_record (id, kind, file_name, file_size, checksum, status, error_message, created_by, created_at, details)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
UPDATE system.backup_record
SET status = $2, error_message = $3, verified_at = $4, details = $5
WHERE id = $1;
SELECT id, service, log_level, enabled_by, enabled_at, expires_at
FROM system.debug_toggle
WHERE expires_at > now();
INSERT INTO system.debug_toggle (id, service, log_level, enabled_by, enabled_at, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (service) DO UPDATE
SET log_level = EXCLUDED.log_level, enabled_by = EXCLUDED.enabled_by, enabled_at = EXCLUDED.enabled_at, expires_at = EXCLUDED.expires_at;
DELETE FROM system.debug_toggle
WHERE service = $1;
DELETE FROM system.debug_toggle
WHERE expires_at <= now();
