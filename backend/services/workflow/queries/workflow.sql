SELECT * FROM workflow.approval_request WHERE id = $1 LIMIT 1;
SELECT * FROM workflow.approval_request ORDER BY created_at DESC;
INSERT INTO workflow.approval_request (
    id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now(), now()
) RETURNING *;
UPDATE workflow.approval_request SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;
DELETE FROM workflow.approval_request WHERE id = $1;
SELECT * FROM workflow.approval_decision WHERE request_id = $1 ORDER BY decided_at ASC;
INSERT INTO workflow.approval_decision (
    id, request_id, approver_id, decision, comments, decided_at
) VALUES (
    $1, $2, $3, $4, $5, now()
) RETURNING *;
SELECT * FROM workflow.signature_request WHERE id = $1 LIMIT 1;
SELECT * FROM workflow.signature_request ORDER BY created_at DESC;
INSERT INTO workflow.signature_request (
    id, title, document_type, document_id, requested_from, status, expires_at, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING *;
UPDATE workflow.signature_request SET
    status = 'signed',
    signature_url = $2,
    signed_at = now()
WHERE id = $1
RETURNING *;
SELECT * FROM workflow.letter_template ORDER BY sort_order ASC, name_en ASC;
SELECT * FROM workflow.letter_template WHERE id = $1 LIMIT 1;
INSERT INTO workflow.letter_template (
    id, name_en, name_ar, template_body, sort_order
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;
SELECT * FROM workflow.official_letter ORDER BY created_at DESC;
SELECT * FROM workflow.official_letter WHERE id = $1 LIMIT 1;
INSERT INTO workflow.official_letter (
    id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
) RETURNING *;
UPDATE workflow.official_letter SET
    status = $2,
    issued_at = CASE WHEN $2 = 'issued' THEN now() ELSE issued_at END
WHERE id = $1
RETURNING *;
SELECT * FROM workflow.minute_of_meeting ORDER BY meeting_date DESC, created_at DESC;
SELECT * FROM workflow.minute_of_meeting WHERE id = $1 LIMIT 1;
INSERT INTO workflow.minute_of_meeting (
    id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
) RETURNING *;
UPDATE workflow.minute_of_meeting SET
    title = $2,
    meeting_date = $3,
    attendees = $4,
    discussion = $5,
    action_items = $6,
    status = $7
WHERE id = $1
RETURNING *;
SELECT * FROM workflow.task WHERE id = $1 LIMIT 1;
SELECT * FROM workflow.task ORDER BY created_at DESC;
INSERT INTO workflow.task (
    id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
) RETURNING *;
UPDATE workflow.task SET
    title = $2,
    description = $3,
    assigned_to = $4,
    due_date = $5,
    status = $6,
    priority = $7,
    updated_at = now()
WHERE id = $1
RETURNING *;
UPDATE workflow.task SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;
DELETE FROM workflow.task WHERE id = $1;
SELECT * FROM workflow.calendar_event ORDER BY start_time ASC;
SELECT * FROM workflow.calendar_event WHERE id = $1 LIMIT 1;
INSERT INTO workflow.calendar_event (
    id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now()
) RETURNING *;
DELETE FROM workflow.calendar_event WHERE id = $1;
