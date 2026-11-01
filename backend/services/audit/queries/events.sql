-- name: InsertEvent :execrows
INSERT INTO audit.event (id, subject, service, entity, verb, actor, occurred_at, payload, trace_id)
VALUES (@id, @subject, @service, @entity, @verb, @actor, @occurred_at, @payload, @trace_id)
ON CONFLICT (id) DO NOTHING;

-- name: ListEvents :many
SELECT * FROM audit.event
WHERE (sqlc.narg('subject')::text IS NULL OR subject = sqlc.narg('subject'))
  AND (sqlc.narg('service')::text IS NULL OR service = sqlc.narg('service'))
  AND (sqlc.narg('actor')::text IS NULL OR actor = sqlc.narg('actor'))
  AND (sqlc.narg('from_time')::timestamptz IS NULL OR occurred_at >= sqlc.narg('from_time'))
  AND (sqlc.narg('to_time')::timestamptz IS NULL OR occurred_at < sqlc.narg('to_time'))
  AND (NOT @has_cursor::boolean OR (occurred_at, id) < (@before_occurred::timestamptz, @before_id::uuid))
ORDER BY occurred_at DESC, id DESC
LIMIT @page_size;

-- name: GetEvent :one
SELECT * FROM audit.event WHERE id = @id;

-- name: Subjects :many
SELECT subject, count(*)::bigint AS events, max(occurred_at)::timestamptz AS last_at
FROM audit.event GROUP BY subject ORDER BY subject LIMIT 500;
