SELECT * FROM itsm.sla_policy WHERE priority = $1;
SELECT * FROM itsm.sla_policy ORDER BY response_minutes;
UPDATE itsm.sla_policy SET response_minutes = $2, resolve_minutes = $3, updated_by = $4, updated_at = $5
WHERE priority = $1;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status,
    title, description, asset_ref, respond_by, resolve_by, created_at, updated_at)
VALUES (@id, @requester_id, @requester_name, @requester_email, @category, @subcategory, @priority, @status,
    @title, @description, @asset_ref, @respond_by, @resolve_by, @now, @now)
RETURNING *;
SELECT * FROM itsm.ticket WHERE id = $1;
SELECT * FROM itsm.ticket WHERE id = $1 FOR UPDATE;
UPDATE itsm.ticket SET status = @status, assignee_id = @assignee_id, assignee_name = @assignee_name,
    first_response_at = @first_response_at, resolved_at = @resolved_at, closed_at = @closed_at, updated_at = @now
WHERE id = @id
RETURNING *;
UPDATE itsm.ticket SET first_response_at = COALESCE(first_response_at, @first_response_at), updated_at = @now WHERE id = @id;
SELECT * FROM itsm.ticket
WHERE requester_id = @requester_id
  AND (@status::text = '' OR status = @status)
  AND (NOT @has_cursor::boolean OR (created_at, id) < (@before_created::timestamptz, @before_id::uuid))
ORDER BY created_at DESC, id DESC
LIMIT @page_size;
SELECT * FROM itsm.ticket
WHERE (@status::text = '' OR status = @status)
  AND (@assignee_id::text = '' OR assignee_id = @assignee_id)
  AND (@priority::text = '' OR priority = @priority)
  AND (@category::text = '' OR category = @category)
  AND (NOT @open_only::boolean OR status = ANY(@open_statuses::text[]))
  AND (NOT @has_cursor::boolean OR (created_at, id) < (@before_created::timestamptz, @before_id::uuid))
ORDER BY created_at DESC, id DESC
LIMIT @page_size;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
SELECT * FROM itsm.ticket_event WHERE ticket_id = $1 ORDER BY created_at, id;
INSERT INTO itsm.ticket_comment (id, ticket_id, author_realm, author_id, author_name, body, internal, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;
SELECT * FROM itsm.ticket_comment WHERE ticket_id = @ticket_id AND (@include_internal::boolean OR NOT internal)
ORDER BY created_at, id;
INSERT INTO itsm.ticket_attachment (ticket_id, file_url, file_name, mime_type, file_size, added_by, comment_id, created_at)
VALUES (@ticket_id, @file_url, @file_name, @mime_type, @file_size, @added_by, @comment_id, @created_at)
ON CONFLICT (ticket_id, file_url) DO UPDATE SET
    comment_id = COALESCE(EXCLUDED.comment_id, itsm.ticket_attachment.comment_id);
SELECT a.* FROM itsm.ticket_attachment a
WHERE a.ticket_id = @ticket_id
  AND (
    @include_internal::boolean
    OR a.comment_id IS NULL
    OR EXISTS (
        SELECT 1 FROM itsm.ticket_comment c
        WHERE c.id = a.comment_id AND NOT c.internal
    )
  )
ORDER BY a.created_at, a.file_url;
SELECT * FROM itsm.ticket_attachment
WHERE comment_id = $1
ORDER BY created_at, file_url;
UPDATE itsm.ticket SET breached_at = @now, updated_at = @now
WHERE id IN (
    SELECT t.id FROM itsm.ticket AS t
    WHERE t.breached_at IS NULL AND t.closed_at IS NULL AND (
        (t.resolved_at IS NULL AND t.resolve_by <= @now)
        OR (t.first_response_at IS NULL AND t.respond_by <= @now)
    )
    ORDER BY LEAST(t.resolve_by, t.respond_by) LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
)
RETURNING id, number, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, assignee_id, respond_by, resolve_by, first_response_at, resolved_at;
SELECT t.id, t.number, t.requester_id, t.requester_name, t.requester_email, t.category, t.subcategory, t.priority, t.status, t.title, t.assignee_id, t.respond_by, t.resolve_by, t.first_response_at
FROM itsm.ticket AS t
WHERE t.reminded_at IS NULL
  AND t.breached_at IS NULL
  AND t.closed_at IS NULL
  AND t.resolved_at IS NULL
  AND (
    (t.first_response_at IS NULL AND t.respond_by <= @threshold::timestamptz)
    OR (t.resolve_by <= @threshold::timestamptz)
  )
ORDER BY LEAST(t.resolve_by, t.respond_by)
LIMIT @batch_size::int
FOR UPDATE SKIP LOCKED;
UPDATE itsm.ticket SET reminded_at = @now, updated_at = @now
WHERE id = ANY(@ids::uuid[]);
SELECT status, priority, count(*)::bigint AS tickets,
       count(*) FILTER (WHERE breached_at IS NOT NULL)::bigint AS breached,
       count(*) FILTER (WHERE assignee_id IS NULL)::bigint AS unassigned
FROM itsm.ticket
WHERE status = ANY(@open_statuses::text[])
GROUP BY status, priority;
