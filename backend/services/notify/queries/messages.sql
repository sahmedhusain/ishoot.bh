-- name: InsertMessage :execrows
INSERT INTO notify.message (id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html)
VALUES (@id, @caller, @idempotency_key, @actor, @channel, @recipient, @subject, @body_text, @body_html)
ON CONFLICT (caller, idempotency_key) DO NOTHING;

-- name: InsertAttachment :exec
INSERT INTO notify.attachment (message_id, position, filename, content_type, content)
VALUES (@message_id, @position, @filename, @content_type, @content);

-- name: MessageByKey :one
SELECT * FROM notify.message WHERE caller = @caller AND idempotency_key = @idempotency_key;

-- name: GetMessage :one
SELECT * FROM notify.message WHERE id = @id;

-- name: LockMessage :one
SELECT * FROM notify.message WHERE id = @id FOR UPDATE;

-- name: Attachments :many
SELECT * FROM notify.attachment WHERE message_id = @message_id ORDER BY position;

-- name: AttachmentNames :many
SELECT message_id, position, filename, content_type, length(content)::bigint AS size
FROM notify.attachment WHERE message_id = @message_id ORDER BY position;

-- name: MarkSent :exec
UPDATE notify.message SET status = 'sent', attempts = attempts + 1, provider = @provider, provider_id = @provider_id,
    last_error = NULL, sent_at = @now, updated_at = @now
WHERE id = @id;

-- name: MarkAttempt :exec
UPDATE notify.message SET attempts = attempts + 1, provider = @provider, last_error = @last_error, updated_at = @now
WHERE id = @id;

-- name: MarkFailed :exec
UPDATE notify.message SET status = 'failed', attempts = attempts + 1, provider = @provider, last_error = @last_error,
    updated_at = @now
WHERE id = @id;

-- name: Requeue :execrows
UPDATE notify.message SET status = 'queued', updated_at = @now WHERE id = @id AND status = 'failed';

-- name: ListMessages :many
SELECT * FROM notify.message
WHERE (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('channel')::text IS NULL OR channel = sqlc.narg('channel'))
  AND (NOT @has_cursor::boolean OR (created_at, id) < (@before_created::timestamptz, @before_id::uuid))
ORDER BY created_at DESC, id DESC
LIMIT @page_size;

-- name: CountByStatus :many
SELECT status, channel, count(*)::bigint AS messages FROM notify.message
WHERE created_at >= @since GROUP BY status, channel;
