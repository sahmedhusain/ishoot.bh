-- name: InsertFile :one
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at)
VALUES (@id, @file_url, @owner_id, @file_name, @file_size, @mime_type, @is_public, @claimed_at, @expires_at)
ON CONFLICT (file_url) DO NOTHING
RETURNING *;

-- name: GetFile :one
SELECT * FROM files.upload_object WHERE file_url = @file_url;

-- name: ListFiles :many
SELECT * FROM files.upload_object WHERE file_url = ANY(@file_urls::text[]) ORDER BY file_url;

-- name: ClaimFile :one
UPDATE files.upload_object
SET claimed_at = @now
WHERE file_url = @file_url AND owner_id = @owner_id AND claimed_at IS NULL AND expires_at > @now
RETURNING *;

-- name: DeleteFile :execrows
DELETE FROM files.upload_object WHERE file_url = @file_url;

-- name: LockExpiredUploads :many
SELECT * FROM files.upload_object
WHERE claimed_at IS NULL AND expires_at < @now
ORDER BY expires_at
LIMIT @batch_size
FOR UPDATE SKIP LOCKED;

-- name: DeleteFilesByID :exec
DELETE FROM files.upload_object WHERE id = ANY(@ids::text[]);

-- name: LockOrphanedPrivateUploads :many
SELECT * FROM files.upload_object
WHERE claimed_at IS NOT NULL AND claimed_at < @older_than
ORDER BY claimed_at
LIMIT @batch_size
FOR UPDATE SKIP LOCKED;
