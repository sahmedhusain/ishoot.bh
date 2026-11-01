-- name: SLAPolicy :one
SELECT * FROM itsm.sla_policy WHERE priority = $1;

-- name: ListSLAPolicies :many
SELECT * FROM itsm.sla_policy ORDER BY response_minutes;

-- name: UpdateSLAPolicy :execrows
UPDATE itsm.sla_policy SET response_minutes = $2, resolve_minutes = $3, updated_by = $4, updated_at = $5
WHERE priority = $1;

-- name: InsertTicket :one
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status,
    title, description, asset_ref, respond_by, resolve_by, created_at, updated_at)
VALUES (@id, @requester_id, @requester_name, @requester_email, @category, @subcategory, @priority, @status,
    @title, @description, @asset_ref, @respond_by, @resolve_by, @now, @now)
RETURNING *;

-- name: GetTicket :one
SELECT * FROM itsm.ticket WHERE id = $1;

-- name: LockTicket :one
SELECT * FROM itsm.ticket WHERE id = $1 FOR UPDATE;

-- name: UpdateTicketState :one
UPDATE itsm.ticket SET status = @status, assignee_id = @assignee_id, assignee_name = @assignee_name,
    first_response_at = @first_response_at, resolved_at = @resolved_at, closed_at = @closed_at, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: TouchTicket :exec
UPDATE itsm.ticket SET first_response_at = COALESCE(first_response_at, @first_response_at), updated_at = @now WHERE id = @id;

-- name: ListRequesterTickets :many
SELECT * FROM itsm.ticket
WHERE requester_id = @requester_id
  AND (@status::text = '' OR status = @status)
  AND (NOT @has_cursor::boolean OR (created_at, id) < (@before_created::timestamptz, @before_id::uuid))
ORDER BY created_at DESC, id DESC
LIMIT @page_size;

-- name: ListQueue :many
SELECT * FROM itsm.ticket
WHERE (@status::text = '' OR status = @status)
  AND (@assignee_id::text = '' OR assignee_id = @assignee_id)
  AND (@priority::text = '' OR priority = @priority)
  AND (NOT @open_only::boolean OR status = ANY(@open_statuses::text[]))
  AND (NOT @has_cursor::boolean OR (created_at, id) < (@before_created::timestamptz, @before_id::uuid))
ORDER BY created_at DESC, id DESC
LIMIT @page_size;

-- name: InsertEvent :exec
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: ListEvents :many
SELECT * FROM itsm.ticket_event WHERE ticket_id = $1 ORDER BY created_at, id;

-- name: InsertComment :one
INSERT INTO itsm.ticket_comment (id, ticket_id, author_realm, author_id, author_name, body, internal, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListComments :many
SELECT * FROM itsm.ticket_comment WHERE ticket_id = @ticket_id AND (@include_internal::boolean OR NOT internal)
ORDER BY created_at, id;

-- name: InsertAttachment :exec
INSERT INTO itsm.ticket_attachment (ticket_id, file_url, file_name, mime_type, file_size, added_by, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;

-- name: ListAttachments :many
SELECT * FROM itsm.ticket_attachment WHERE ticket_id = $1 ORDER BY created_at, file_url;

-- name: MarkBreached :many
UPDATE itsm.ticket SET breached_at = @now, updated_at = @now
WHERE id IN (
    SELECT t.id FROM itsm.ticket AS t
    WHERE t.breached_at IS NULL AND t.resolved_at IS NULL AND t.closed_at IS NULL AND t.resolve_by <= @now
    ORDER BY t.resolve_by LIMIT @batch_size::int FOR UPDATE SKIP LOCKED
)
RETURNING id;
