-- name: GetApprovalRequestByID :one
SELECT * FROM workflow.approval_request WHERE id = $1 LIMIT 1;

-- name: ListApprovalRequests :many
SELECT * FROM workflow.approval_request ORDER BY created_at DESC;

-- name: CreateApprovalRequest :one
INSERT INTO workflow.approval_request (
    id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now(), now()
) RETURNING *;

-- name: UpdateApprovalRequestStatus :one
UPDATE workflow.approval_request SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteApprovalRequest :exec
DELETE FROM workflow.approval_request WHERE id = $1;

-- name: ListApprovalDecisions :many
SELECT * FROM workflow.approval_decision WHERE request_id = $1 ORDER BY decided_at ASC;

-- name: CreateApprovalDecision :one
INSERT INTO workflow.approval_decision (
    id, request_id, approver_id, decision, comments, decided_at
) VALUES (
    $1, $2, $3, $4, $5, now()
) RETURNING *;

-- name: GetSignatureRequestByID :one
SELECT * FROM workflow.signature_request WHERE id = $1 LIMIT 1;

-- name: ListSignatureRequests :many
SELECT * FROM workflow.signature_request ORDER BY created_at DESC;

-- name: CreateSignatureRequest :one
INSERT INTO workflow.signature_request (
    id, title, document_type, document_id, requested_from, status, expires_at, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING *;

-- name: RecordSignature :one
UPDATE workflow.signature_request SET
    status = 'signed',
    signature_url = $2,
    signed_at = now()
WHERE id = $1
RETURNING *;

-- name: ListLetterTemplates :many
SELECT * FROM workflow.letter_template ORDER BY sort_order ASC, name_en ASC;

-- name: GetLetterTemplate :one
SELECT * FROM workflow.letter_template WHERE id = $1 LIMIT 1;

-- name: CreateLetterTemplate :one
INSERT INTO workflow.letter_template (
    id, name_en, name_ar, template_body, sort_order
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: ListOfficialLetters :many
SELECT * FROM workflow.official_letter ORDER BY created_at DESC;

-- name: GetOfficialLetter :one
SELECT * FROM workflow.official_letter WHERE id = $1 LIMIT 1;

-- name: CreateOfficialLetter :one
INSERT INTO workflow.official_letter (
    id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
) RETURNING *;

-- name: UpdateOfficialLetterStatus :one
UPDATE workflow.official_letter SET
    status = $2,
    issued_at = CASE WHEN $2 = 'issued' THEN now() ELSE issued_at END
WHERE id = $1
RETURNING *;

-- name: ListMOMs :many
SELECT * FROM workflow.minute_of_meeting ORDER BY meeting_date DESC, created_at DESC;

-- name: ListMOMsFiltered :many
SELECT * FROM workflow.minute_of_meeting
WHERE (sqlc.narg(client_id)::text IS NULL OR client_id = sqlc.narg(client_id))
  AND (sqlc.narg(deal_id)::text IS NULL OR deal_id = sqlc.narg(deal_id))
  AND (sqlc.narg(project_id)::text IS NULL OR project_id = sqlc.narg(project_id))
  AND (sqlc.narg(department_id)::text IS NULL OR department_id = sqlc.narg(department_id))
  AND (sqlc.narg(team_id)::text IS NULL OR team_id = sqlc.narg(team_id))
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY meeting_date DESC, created_at DESC;

-- name: GetMOM :one
SELECT * FROM workflow.minute_of_meeting WHERE id = $1 LIMIT 1;

-- name: CreateMOM :one
INSERT INTO workflow.minute_of_meeting (
    id, mom_number, title, meeting_date, attendees, discussion, action_items, status,
    title_ar, start_time, end_time, location,
    client_id, deal_id, project_id, department_id, team_id,
    organizer_id, created_by_id, approved_by_id,
    agenda, decisions, notes, signature_url, pdf_storage_path,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12,
    $13, $14, $15, $16, $17,
    $18, $19, $20,
    $21, $22, $23, $24, $25,
    now(), now()
) RETURNING *;

-- name: UpdateMOM :one
UPDATE workflow.minute_of_meeting SET
    title = $2,
    meeting_date = $3,
    attendees = $4,
    discussion = $5,
    action_items = $6,
    status = $7,
    title_ar = $8,
    start_time = $9,
    end_time = $10,
    location = $11,
    client_id = $12,
    deal_id = $13,
    project_id = $14,
    department_id = $15,
    team_id = $16,
    organizer_id = $17,
    approved_by_id = $18,
    agenda = $19,
    decisions = $20,
    notes = $21,
    signature_url = $22,
    pdf_storage_path = $23,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteMOM :exec
DELETE FROM workflow.minute_of_meeting WHERE id = $1;

-- name: ListMomAttendees :many
SELECT * FROM workflow.mom_attendee WHERE mom_id = $1 ORDER BY created_at ASC;

-- name: InsertMomAttendee :one
INSERT INTO workflow.mom_attendee (
    id, mom_id, attendee_type, employee_id, user_id, contact_id, department_id,
    display_name, email, role_title, attended, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, now()
) RETURNING *;

-- name: DeleteMomAttendees :exec
DELETE FROM workflow.mom_attendee WHERE mom_id = $1;

-- name: ListMomActionItems :many
SELECT * FROM workflow.mom_action_item WHERE mom_id = $1 ORDER BY created_at ASC;

-- name: InsertMomActionItem :one
INSERT INTO workflow.mom_action_item (
    id, mom_id, task_id, title, description,
    assignee_employee_id, assignee_user_id, department_id, due_date, status, created_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10, now()
) RETURNING *;

-- name: DeleteMomActionItems :exec
DELETE FROM workflow.mom_action_item WHERE mom_id = $1;

-- name: GetTaskByID :one
SELECT * FROM workflow.task WHERE id = $1 LIMIT 1;

-- name: ListTasks :many
SELECT * FROM workflow.task ORDER BY created_at DESC;

-- name: ListTasksFiltered :many
SELECT * FROM workflow.task
WHERE (sqlc.narg(project_id)::text IS NULL OR project_id = sqlc.narg(project_id))
  AND (sqlc.narg(department_id)::text IS NULL OR department_id = sqlc.narg(department_id))
  AND (sqlc.narg(mom_id)::text IS NULL OR mom_id = sqlc.narg(mom_id))
  AND (sqlc.narg(client_id)::text IS NULL OR client_id = sqlc.narg(client_id))
  AND (sqlc.narg(deal_id)::text IS NULL OR deal_id = sqlc.narg(deal_id))
  AND (sqlc.narg(assigned_to)::text IS NULL OR assigned_to = sqlc.narg(assigned_to))
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY created_at DESC;

-- name: CreateTask :one
INSERT INTO workflow.task (
    id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id,
    project_id, department_id, mom_id, client_id, deal_id, created_by_id,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9,
    $10, $11, $12, $13, $14, $15,
    now(), now()
) RETURNING *;

-- name: UpdateTask :one
UPDATE workflow.task SET
    title = $2,
    description = $3,
    assigned_to = $4,
    due_date = $5,
    status = $6,
    priority = $7,
    project_id = $8,
    department_id = $9,
    mom_id = $10,
    client_id = $11,
    deal_id = $12,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateTaskStatus :one
UPDATE workflow.task SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteTask :exec
DELETE FROM workflow.task WHERE id = $1;

-- name: UpsertWorkflowDirectoryRef :exec
INSERT INTO workflow.directory_ref (
    kind, id, name, name_ar, email, parent_id, metadata, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) ON CONFLICT (kind, id) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    email = EXCLUDED.email,
    parent_id = EXCLUDED.parent_id,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- name: ListWorkflowDirectoryRefs :many
SELECT * FROM workflow.directory_ref
WHERE (sqlc.narg(kind)::text IS NULL OR kind = sqlc.narg(kind))
ORDER BY kind ASC, name ASC;

-- name: ListCalendarEvents :many
SELECT * FROM workflow.calendar_event ORDER BY start_time ASC;

-- name: GetCalendarEvent :one
SELECT * FROM workflow.calendar_event WHERE id = $1 LIMIT 1;

-- name: CreateCalendarEvent :one
INSERT INTO workflow.calendar_event (
    id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now()
) RETURNING *;

-- name: DeleteCalendarEvent :exec
DELETE FROM workflow.calendar_event WHERE id = $1;
