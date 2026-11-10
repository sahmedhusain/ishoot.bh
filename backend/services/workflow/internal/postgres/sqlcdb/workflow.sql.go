package sqlcdb
import (
	"context"
	"time"
	"github.com/jackc/pgx/v5/pgtype"
)
const createApprovalDecision = `-- name: CreateApprovalDecision :one
INSERT INTO workflow.approval_decision (
    id, request_id, approver_id, decision, comments, decided_at
) VALUES (
    $1, $2, $3, $4, $5, now()
) RETURNING id, request_id, approver_id, decision, comments, decided_at
`
type CreateApprovalDecisionParams struct {
	ID		string
	RequestID	string
	ApproverID	string
	Decision	string
	Comments	*string
}
func (q *Queries) CreateApprovalDecision(ctx context.Context, arg CreateApprovalDecisionParams) (WorkflowApprovalDecision, error) {
	row := q.db.QueryRow(ctx, createApprovalDecision,
		arg.ID,
		arg.RequestID,
		arg.ApproverID,
		arg.Decision,
		arg.Comments,
	)
	var i WorkflowApprovalDecision
	err := row.Scan(
		&i.ID,
		&i.RequestID,
		&i.ApproverID,
		&i.Decision,
		&i.Comments,
		&i.DecidedAt,
	)
	return i, err
}
const createApprovalRequest = `-- name: CreateApprovalRequest :one
INSERT INTO workflow.approval_request (
    id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now(), now()
) RETURNING id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
`
type CreateApprovalRequestParams struct {
	ID		string
	Kind		string
	EntityID	string
	RequesterID	string
	Status		string
	Priority	string
	Reason		*string
}
func (q *Queries) CreateApprovalRequest(ctx context.Context, arg CreateApprovalRequestParams) (WorkflowApprovalRequest, error) {
	row := q.db.QueryRow(ctx, createApprovalRequest,
		arg.ID,
		arg.Kind,
		arg.EntityID,
		arg.RequesterID,
		arg.Status,
		arg.Priority,
		arg.Reason,
	)
	var i WorkflowApprovalRequest
	err := row.Scan(
		&i.ID,
		&i.Kind,
		&i.EntityID,
		&i.RequesterID,
		&i.Status,
		&i.Priority,
		&i.Reason,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const createCalendarEvent = `-- name: CreateCalendarEvent :one
INSERT INTO workflow.calendar_event (
    id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now()
) RETURNING id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at
`
type CreateCalendarEventParams struct {
	ID		string
	Title		string
	Description	*string
	StartTime	time.Time
	EndTime		time.Time
	IsAllDay	bool
	Location	*string
	OrganizerID	string
	EventType	string
}
func (q *Queries) CreateCalendarEvent(ctx context.Context, arg CreateCalendarEventParams) (WorkflowCalendarEvent, error) {
	row := q.db.QueryRow(ctx, createCalendarEvent,
		arg.ID,
		arg.Title,
		arg.Description,
		arg.StartTime,
		arg.EndTime,
		arg.IsAllDay,
		arg.Location,
		arg.OrganizerID,
		arg.EventType,
	)
	var i WorkflowCalendarEvent
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.StartTime,
		&i.EndTime,
		&i.IsAllDay,
		&i.Location,
		&i.OrganizerID,
		&i.EventType,
		&i.CreatedAt,
	)
	return i, err
}
const createLetterTemplate = `-- name: CreateLetterTemplate :one
INSERT INTO workflow.letter_template (
    id, name_en, name_ar, template_body, sort_order
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING id, name_en, name_ar, template_body, sort_order
`
type CreateLetterTemplateParams struct {
	ID		string
	NameEn		string
	NameAr		string
	TemplateBody	string
	SortOrder	int32
}
func (q *Queries) CreateLetterTemplate(ctx context.Context, arg CreateLetterTemplateParams) (WorkflowLetterTemplate, error) {
	row := q.db.QueryRow(ctx, createLetterTemplate,
		arg.ID,
		arg.NameEn,
		arg.NameAr,
		arg.TemplateBody,
		arg.SortOrder,
	)
	var i WorkflowLetterTemplate
	err := row.Scan(
		&i.ID,
		&i.NameEn,
		&i.NameAr,
		&i.TemplateBody,
		&i.SortOrder,
	)
	return i, err
}
const createMOM = `-- name: CreateMOM :one
INSERT INTO workflow.minute_of_meeting (
    id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
) RETURNING id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at
`
type CreateMOMParams struct {
	ID		string
	MomNumber	string
	Title		string
	MeetingDate	pgtype.Date
	Attendees	[]string
	Discussion	string
	ActionItems	*string
	Status		string
}
func (q *Queries) CreateMOM(ctx context.Context, arg CreateMOMParams) (WorkflowMinuteOfMeeting, error) {
	row := q.db.QueryRow(ctx, createMOM,
		arg.ID,
		arg.MomNumber,
		arg.Title,
		arg.MeetingDate,
		arg.Attendees,
		arg.Discussion,
		arg.ActionItems,
		arg.Status,
	)
	var i WorkflowMinuteOfMeeting
	err := row.Scan(
		&i.ID,
		&i.MomNumber,
		&i.Title,
		&i.MeetingDate,
		&i.Attendees,
		&i.Discussion,
		&i.ActionItems,
		&i.Status,
		&i.CreatedAt,
	)
	return i, err
}
const createOfficialLetter = `-- name: CreateOfficialLetter :one
INSERT INTO workflow.official_letter (
    id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
) RETURNING id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at, created_at
`
type CreateOfficialLetterParams struct {
	ID		string
	LetterNumber	string
	TemplateID	*string
	RecipientName	string
	RecipientTitle	*string
	Subject		string
	Body		string
	Status		string
}
func (q *Queries) CreateOfficialLetter(ctx context.Context, arg CreateOfficialLetterParams) (WorkflowOfficialLetter, error) {
	row := q.db.QueryRow(ctx, createOfficialLetter,
		arg.ID,
		arg.LetterNumber,
		arg.TemplateID,
		arg.RecipientName,
		arg.RecipientTitle,
		arg.Subject,
		arg.Body,
		arg.Status,
	)
	var i WorkflowOfficialLetter
	err := row.Scan(
		&i.ID,
		&i.LetterNumber,
		&i.TemplateID,
		&i.RecipientName,
		&i.RecipientTitle,
		&i.Subject,
		&i.Body,
		&i.Status,
		&i.IssuedAt,
		&i.CreatedAt,
	)
	return i, err
}
const createSignatureRequest = `-- name: CreateSignatureRequest :one
INSERT INTO workflow.signature_request (
    id, title, document_type, document_id, requested_from, status, expires_at, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at
`
type CreateSignatureRequestParams struct {
	ID		string
	Title		string
	DocumentType	string
	DocumentID	string
	RequestedFrom	string
	Status		string
	ExpiresAt	*time.Time
}
func (q *Queries) CreateSignatureRequest(ctx context.Context, arg CreateSignatureRequestParams) (WorkflowSignatureRequest, error) {
	row := q.db.QueryRow(ctx, createSignatureRequest,
		arg.ID,
		arg.Title,
		arg.DocumentType,
		arg.DocumentID,
		arg.RequestedFrom,
		arg.Status,
		arg.ExpiresAt,
	)
	var i WorkflowSignatureRequest
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.DocumentType,
		&i.DocumentID,
		&i.RequestedFrom,
		&i.Status,
		&i.SignatureUrl,
		&i.SignedAt,
		&i.ExpiresAt,
		&i.CreatedAt,
	)
	return i, err
}
const createTask = `-- name: CreateTask :one
INSERT INTO workflow.task (
    id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
) RETURNING id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
`
type CreateTaskParams struct {
	ID			string
	Title			string
	Description		*string
	AssignedTo		*string
	DueDate			*time.Time
	Status			string
	Priority		string
	RelatedEntityType	*string
	RelatedEntityID		*string
}
func (q *Queries) CreateTask(ctx context.Context, arg CreateTaskParams) (WorkflowTask, error) {
	row := q.db.QueryRow(ctx, createTask,
		arg.ID,
		arg.Title,
		arg.Description,
		arg.AssignedTo,
		arg.DueDate,
		arg.Status,
		arg.Priority,
		arg.RelatedEntityType,
		arg.RelatedEntityID,
	)
	var i WorkflowTask
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.AssignedTo,
		&i.DueDate,
		&i.Status,
		&i.Priority,
		&i.RelatedEntityType,
		&i.RelatedEntityID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const deleteApprovalRequest = `-- name: DeleteApprovalRequest :exec
DELETE FROM workflow.approval_request WHERE id = $1
`
func (q *Queries) DeleteApprovalRequest(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteApprovalRequest, id)
	return err
}
const deleteCalendarEvent = `-- name: DeleteCalendarEvent :exec
DELETE FROM workflow.calendar_event WHERE id = $1
`
func (q *Queries) DeleteCalendarEvent(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteCalendarEvent, id)
	return err
}
const deleteTask = `-- name: DeleteTask :exec
DELETE FROM workflow.task WHERE id = $1
`
func (q *Queries) DeleteTask(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteTask, id)
	return err
}
const getApprovalRequestByID = `-- name: GetApprovalRequestByID :one
SELECT id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at FROM workflow.approval_request WHERE id = $1 LIMIT 1
`
func (q *Queries) GetApprovalRequestByID(ctx context.Context, id string) (WorkflowApprovalRequest, error) {
	row := q.db.QueryRow(ctx, getApprovalRequestByID, id)
	var i WorkflowApprovalRequest
	err := row.Scan(
		&i.ID,
		&i.Kind,
		&i.EntityID,
		&i.RequesterID,
		&i.Status,
		&i.Priority,
		&i.Reason,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getCalendarEvent = `-- name: GetCalendarEvent :one
SELECT id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at FROM workflow.calendar_event WHERE id = $1 LIMIT 1
`
func (q *Queries) GetCalendarEvent(ctx context.Context, id string) (WorkflowCalendarEvent, error) {
	row := q.db.QueryRow(ctx, getCalendarEvent, id)
	var i WorkflowCalendarEvent
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.StartTime,
		&i.EndTime,
		&i.IsAllDay,
		&i.Location,
		&i.OrganizerID,
		&i.EventType,
		&i.CreatedAt,
	)
	return i, err
}
const getLetterTemplate = `-- name: GetLetterTemplate :one
SELECT id, name_en, name_ar, template_body, sort_order FROM workflow.letter_template WHERE id = $1 LIMIT 1
`
func (q *Queries) GetLetterTemplate(ctx context.Context, id string) (WorkflowLetterTemplate, error) {
	row := q.db.QueryRow(ctx, getLetterTemplate, id)
	var i WorkflowLetterTemplate
	err := row.Scan(
		&i.ID,
		&i.NameEn,
		&i.NameAr,
		&i.TemplateBody,
		&i.SortOrder,
	)
	return i, err
}
const getMOM = `-- name: GetMOM :one
SELECT id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at FROM workflow.minute_of_meeting WHERE id = $1 LIMIT 1
`
func (q *Queries) GetMOM(ctx context.Context, id string) (WorkflowMinuteOfMeeting, error) {
	row := q.db.QueryRow(ctx, getMOM, id)
	var i WorkflowMinuteOfMeeting
	err := row.Scan(
		&i.ID,
		&i.MomNumber,
		&i.Title,
		&i.MeetingDate,
		&i.Attendees,
		&i.Discussion,
		&i.ActionItems,
		&i.Status,
		&i.CreatedAt,
	)
	return i, err
}
const getOfficialLetter = `-- name: GetOfficialLetter :one
SELECT id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at, created_at FROM workflow.official_letter WHERE id = $1 LIMIT 1
`
func (q *Queries) GetOfficialLetter(ctx context.Context, id string) (WorkflowOfficialLetter, error) {
	row := q.db.QueryRow(ctx, getOfficialLetter, id)
	var i WorkflowOfficialLetter
	err := row.Scan(
		&i.ID,
		&i.LetterNumber,
		&i.TemplateID,
		&i.RecipientName,
		&i.RecipientTitle,
		&i.Subject,
		&i.Body,
		&i.Status,
		&i.IssuedAt,
		&i.CreatedAt,
	)
	return i, err
}
const getSignatureRequestByID = `-- name: GetSignatureRequestByID :one
SELECT id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at FROM workflow.signature_request WHERE id = $1 LIMIT 1
`
func (q *Queries) GetSignatureRequestByID(ctx context.Context, id string) (WorkflowSignatureRequest, error) {
	row := q.db.QueryRow(ctx, getSignatureRequestByID, id)
	var i WorkflowSignatureRequest
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.DocumentType,
		&i.DocumentID,
		&i.RequestedFrom,
		&i.Status,
		&i.SignatureUrl,
		&i.SignedAt,
		&i.ExpiresAt,
		&i.CreatedAt,
	)
	return i, err
}
const getTaskByID = `-- name: GetTaskByID :one
SELECT id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at FROM workflow.task WHERE id = $1 LIMIT 1
`
func (q *Queries) GetTaskByID(ctx context.Context, id string) (WorkflowTask, error) {
	row := q.db.QueryRow(ctx, getTaskByID, id)
	var i WorkflowTask
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.AssignedTo,
		&i.DueDate,
		&i.Status,
		&i.Priority,
		&i.RelatedEntityType,
		&i.RelatedEntityID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const listApprovalDecisions = `-- name: ListApprovalDecisions :many
SELECT id, request_id, approver_id, decision, comments, decided_at FROM workflow.approval_decision WHERE request_id = $1 ORDER BY decided_at ASC
`
func (q *Queries) ListApprovalDecisions(ctx context.Context, requestID string) ([]WorkflowApprovalDecision, error) {
	rows, err := q.db.Query(ctx, listApprovalDecisions, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowApprovalDecision
	for rows.Next() {
		var i WorkflowApprovalDecision
		if err := rows.Scan(
			&i.ID,
			&i.RequestID,
			&i.ApproverID,
			&i.Decision,
			&i.Comments,
			&i.DecidedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listApprovalRequests = `-- name: ListApprovalRequests :many
SELECT id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at FROM workflow.approval_request ORDER BY created_at DESC
`
func (q *Queries) ListApprovalRequests(ctx context.Context) ([]WorkflowApprovalRequest, error) {
	rows, err := q.db.Query(ctx, listApprovalRequests)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowApprovalRequest
	for rows.Next() {
		var i WorkflowApprovalRequest
		if err := rows.Scan(
			&i.ID,
			&i.Kind,
			&i.EntityID,
			&i.RequesterID,
			&i.Status,
			&i.Priority,
			&i.Reason,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listCalendarEvents = `-- name: ListCalendarEvents :many
SELECT id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at FROM workflow.calendar_event ORDER BY start_time ASC
`
func (q *Queries) ListCalendarEvents(ctx context.Context) ([]WorkflowCalendarEvent, error) {
	rows, err := q.db.Query(ctx, listCalendarEvents)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowCalendarEvent
	for rows.Next() {
		var i WorkflowCalendarEvent
		if err := rows.Scan(
			&i.ID,
			&i.Title,
			&i.Description,
			&i.StartTime,
			&i.EndTime,
			&i.IsAllDay,
			&i.Location,
			&i.OrganizerID,
			&i.EventType,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listLetterTemplates = `-- name: ListLetterTemplates :many
SELECT id, name_en, name_ar, template_body, sort_order FROM workflow.letter_template ORDER BY sort_order ASC, name_en ASC
`
func (q *Queries) ListLetterTemplates(ctx context.Context) ([]WorkflowLetterTemplate, error) {
	rows, err := q.db.Query(ctx, listLetterTemplates)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowLetterTemplate
	for rows.Next() {
		var i WorkflowLetterTemplate
		if err := rows.Scan(
			&i.ID,
			&i.NameEn,
			&i.NameAr,
			&i.TemplateBody,
			&i.SortOrder,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listMOMs = `-- name: ListMOMs :many
SELECT id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at FROM workflow.minute_of_meeting ORDER BY meeting_date DESC, created_at DESC
`
func (q *Queries) ListMOMs(ctx context.Context) ([]WorkflowMinuteOfMeeting, error) {
	rows, err := q.db.Query(ctx, listMOMs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowMinuteOfMeeting
	for rows.Next() {
		var i WorkflowMinuteOfMeeting
		if err := rows.Scan(
			&i.ID,
			&i.MomNumber,
			&i.Title,
			&i.MeetingDate,
			&i.Attendees,
			&i.Discussion,
			&i.ActionItems,
			&i.Status,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listOfficialLetters = `-- name: ListOfficialLetters :many
SELECT id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at, created_at FROM workflow.official_letter ORDER BY created_at DESC
`
func (q *Queries) ListOfficialLetters(ctx context.Context) ([]WorkflowOfficialLetter, error) {
	rows, err := q.db.Query(ctx, listOfficialLetters)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowOfficialLetter
	for rows.Next() {
		var i WorkflowOfficialLetter
		if err := rows.Scan(
			&i.ID,
			&i.LetterNumber,
			&i.TemplateID,
			&i.RecipientName,
			&i.RecipientTitle,
			&i.Subject,
			&i.Body,
			&i.Status,
			&i.IssuedAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listSignatureRequests = `-- name: ListSignatureRequests :many
SELECT id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at FROM workflow.signature_request ORDER BY created_at DESC
`
func (q *Queries) ListSignatureRequests(ctx context.Context) ([]WorkflowSignatureRequest, error) {
	rows, err := q.db.Query(ctx, listSignatureRequests)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowSignatureRequest
	for rows.Next() {
		var i WorkflowSignatureRequest
		if err := rows.Scan(
			&i.ID,
			&i.Title,
			&i.DocumentType,
			&i.DocumentID,
			&i.RequestedFrom,
			&i.Status,
			&i.SignatureUrl,
			&i.SignedAt,
			&i.ExpiresAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const listTasks = `-- name: ListTasks :many
SELECT id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at FROM workflow.task ORDER BY created_at DESC
`
func (q *Queries) ListTasks(ctx context.Context) ([]WorkflowTask, error) {
	rows, err := q.db.Query(ctx, listTasks)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkflowTask
	for rows.Next() {
		var i WorkflowTask
		if err := rows.Scan(
			&i.ID,
			&i.Title,
			&i.Description,
			&i.AssignedTo,
			&i.DueDate,
			&i.Status,
			&i.Priority,
			&i.RelatedEntityType,
			&i.RelatedEntityID,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const recordSignature = `-- name: RecordSignature :one
UPDATE workflow.signature_request SET
    status = 'signed',
    signature_url = $2,
    signed_at = now()
WHERE id = $1
RETURNING id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at
`
type RecordSignatureParams struct {
	ID		string
	SignatureUrl	*string
}
func (q *Queries) RecordSignature(ctx context.Context, arg RecordSignatureParams) (WorkflowSignatureRequest, error) {
	row := q.db.QueryRow(ctx, recordSignature, arg.ID, arg.SignatureUrl)
	var i WorkflowSignatureRequest
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.DocumentType,
		&i.DocumentID,
		&i.RequestedFrom,
		&i.Status,
		&i.SignatureUrl,
		&i.SignedAt,
		&i.ExpiresAt,
		&i.CreatedAt,
	)
	return i, err
}
const updateApprovalRequestStatus = `-- name: UpdateApprovalRequestStatus :one
UPDATE workflow.approval_request SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
`
type UpdateApprovalRequestStatusParams struct {
	ID	string
	Status	string
}
func (q *Queries) UpdateApprovalRequestStatus(ctx context.Context, arg UpdateApprovalRequestStatusParams) (WorkflowApprovalRequest, error) {
	row := q.db.QueryRow(ctx, updateApprovalRequestStatus, arg.ID, arg.Status)
	var i WorkflowApprovalRequest
	err := row.Scan(
		&i.ID,
		&i.Kind,
		&i.EntityID,
		&i.RequesterID,
		&i.Status,
		&i.Priority,
		&i.Reason,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const updateMOM = `-- name: UpdateMOM :one
UPDATE workflow.minute_of_meeting SET
    title = $2,
    meeting_date = $3,
    attendees = $4,
    discussion = $5,
    action_items = $6,
    status = $7
WHERE id = $1
RETURNING id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at
`
type UpdateMOMParams struct {
	ID		string
	Title		string
	MeetingDate	pgtype.Date
	Attendees	[]string
	Discussion	string
	ActionItems	*string
	Status		string
}
func (q *Queries) UpdateMOM(ctx context.Context, arg UpdateMOMParams) (WorkflowMinuteOfMeeting, error) {
	row := q.db.QueryRow(ctx, updateMOM,
		arg.ID,
		arg.Title,
		arg.MeetingDate,
		arg.Attendees,
		arg.Discussion,
		arg.ActionItems,
		arg.Status,
	)
	var i WorkflowMinuteOfMeeting
	err := row.Scan(
		&i.ID,
		&i.MomNumber,
		&i.Title,
		&i.MeetingDate,
		&i.Attendees,
		&i.Discussion,
		&i.ActionItems,
		&i.Status,
		&i.CreatedAt,
	)
	return i, err
}
const updateOfficialLetterStatus = `-- name: UpdateOfficialLetterStatus :one
UPDATE workflow.official_letter SET
    status = $2,
    issued_at = CASE WHEN $2 = 'issued' THEN now() ELSE issued_at END
WHERE id = $1
RETURNING id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at, created_at
`
type UpdateOfficialLetterStatusParams struct {
	ID	string
	Status	string
}
func (q *Queries) UpdateOfficialLetterStatus(ctx context.Context, arg UpdateOfficialLetterStatusParams) (WorkflowOfficialLetter, error) {
	row := q.db.QueryRow(ctx, updateOfficialLetterStatus, arg.ID, arg.Status)
	var i WorkflowOfficialLetter
	err := row.Scan(
		&i.ID,
		&i.LetterNumber,
		&i.TemplateID,
		&i.RecipientName,
		&i.RecipientTitle,
		&i.Subject,
		&i.Body,
		&i.Status,
		&i.IssuedAt,
		&i.CreatedAt,
	)
	return i, err
}
const updateTask = `-- name: UpdateTask :one
UPDATE workflow.task SET
    title = $2,
    description = $3,
    assigned_to = $4,
    due_date = $5,
    status = $6,
    priority = $7,
    updated_at = now()
WHERE id = $1
RETURNING id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
`
type UpdateTaskParams struct {
	ID		string
	Title		string
	Description	*string
	AssignedTo	*string
	DueDate		*time.Time
	Status		string
	Priority	string
}
func (q *Queries) UpdateTask(ctx context.Context, arg UpdateTaskParams) (WorkflowTask, error) {
	row := q.db.QueryRow(ctx, updateTask,
		arg.ID,
		arg.Title,
		arg.Description,
		arg.AssignedTo,
		arg.DueDate,
		arg.Status,
		arg.Priority,
	)
	var i WorkflowTask
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.AssignedTo,
		&i.DueDate,
		&i.Status,
		&i.Priority,
		&i.RelatedEntityType,
		&i.RelatedEntityID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const updateTaskStatus = `-- name: UpdateTaskStatus :one
UPDATE workflow.task SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
`
type UpdateTaskStatusParams struct {
	ID	string
	Status	string
}
func (q *Queries) UpdateTaskStatus(ctx context.Context, arg UpdateTaskStatusParams) (WorkflowTask, error) {
	row := q.db.QueryRow(ctx, updateTaskStatus, arg.ID, arg.Status)
	var i WorkflowTask
	err := row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.AssignedTo,
		&i.DueDate,
		&i.Status,
		&i.Priority,
		&i.RelatedEntityType,
		&i.RelatedEntityID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
