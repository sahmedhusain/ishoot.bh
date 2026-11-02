// Package postgres stores workflow entities in the workflow schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
)

const Schema = "workflow"

type ApprovalRequest = sqlcdb.WorkflowApprovalRequest
type ApprovalDecision = sqlcdb.WorkflowApprovalDecision
type SignatureRequest = sqlcdb.WorkflowSignatureRequest
type LetterTemplate = sqlcdb.WorkflowLetterTemplate
type OfficialLetter = sqlcdb.WorkflowOfficialLetter
type MinuteOfMeeting = sqlcdb.WorkflowMinuteOfMeeting
type Task = sqlcdb.WorkflowTask
type CalendarEvent = sqlcdb.WorkflowCalendarEvent

type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}

// Approvals
func (s *Store) GetApprovalRequestByID(ctx context.Context, id string) (ApprovalRequest, error) {
	return s.q.GetApprovalRequestByID(ctx, id)
}
func (s *Store) ListApprovalRequests(ctx context.Context) ([]ApprovalRequest, error) {
	return s.q.ListApprovalRequests(ctx)
}
func (s *Store) CreateApprovalRequest(ctx context.Context, p sqlcdb.CreateApprovalRequestParams) (ApprovalRequest, error) {
	return s.q.CreateApprovalRequest(ctx, p)
}
func (s *Store) UpdateApprovalRequestStatus(ctx context.Context, p sqlcdb.UpdateApprovalRequestStatusParams) (ApprovalRequest, error) {
	return s.q.UpdateApprovalRequestStatus(ctx, p)
}
func (s *Store) DeleteApprovalRequest(ctx context.Context, id string) error {
	return s.q.DeleteApprovalRequest(ctx, id)
}
func (s *Store) ListApprovalDecisions(ctx context.Context, requestID string) ([]ApprovalDecision, error) {
	return s.q.ListApprovalDecisions(ctx, requestID)
}
func (s *Store) CreateApprovalDecision(ctx context.Context, p sqlcdb.CreateApprovalDecisionParams) (ApprovalDecision, error) {
	return s.q.CreateApprovalDecision(ctx, p)
}

// Signatures
func (s *Store) GetSignatureRequestByID(ctx context.Context, id string) (SignatureRequest, error) {
	return s.q.GetSignatureRequestByID(ctx, id)
}
func (s *Store) ListSignatureRequests(ctx context.Context) ([]SignatureRequest, error) {
	return s.q.ListSignatureRequests(ctx)
}
func (s *Store) CreateSignatureRequest(ctx context.Context, p sqlcdb.CreateSignatureRequestParams) (SignatureRequest, error) {
	return s.q.CreateSignatureRequest(ctx, p)
}
func (s *Store) RecordSignature(ctx context.Context, p sqlcdb.RecordSignatureParams) (SignatureRequest, error) {
	return s.q.RecordSignature(ctx, p)
}

// Letters
func (s *Store) ListLetterTemplates(ctx context.Context) ([]LetterTemplate, error) {
	return s.q.ListLetterTemplates(ctx)
}
func (s *Store) GetLetterTemplate(ctx context.Context, id string) (LetterTemplate, error) {
	return s.q.GetLetterTemplate(ctx, id)
}
func (s *Store) CreateLetterTemplate(ctx context.Context, p sqlcdb.CreateLetterTemplateParams) (LetterTemplate, error) {
	return s.q.CreateLetterTemplate(ctx, p)
}
func (s *Store) ListOfficialLetters(ctx context.Context) ([]OfficialLetter, error) {
	return s.q.ListOfficialLetters(ctx)
}
func (s *Store) GetOfficialLetter(ctx context.Context, id string) (OfficialLetter, error) {
	return s.q.GetOfficialLetter(ctx, id)
}
func (s *Store) CreateOfficialLetter(ctx context.Context, p sqlcdb.CreateOfficialLetterParams) (OfficialLetter, error) {
	return s.q.CreateOfficialLetter(ctx, p)
}
func (s *Store) UpdateOfficialLetterStatus(ctx context.Context, p sqlcdb.UpdateOfficialLetterStatusParams) (OfficialLetter, error) {
	return s.q.UpdateOfficialLetterStatus(ctx, p)
}

// MOM
func (s *Store) ListMOMs(ctx context.Context) ([]MinuteOfMeeting, error) {
	return s.q.ListMOMs(ctx)
}
func (s *Store) GetMOM(ctx context.Context, id string) (MinuteOfMeeting, error) {
	return s.q.GetMOM(ctx, id)
}
func (s *Store) CreateMOM(ctx context.Context, p sqlcdb.CreateMOMParams) (MinuteOfMeeting, error) {
	return s.q.CreateMOM(ctx, p)
}
func (s *Store) UpdateMOM(ctx context.Context, p sqlcdb.UpdateMOMParams) (MinuteOfMeeting, error) {
	return s.q.UpdateMOM(ctx, p)
}

// Tasks
func (s *Store) GetTaskByID(ctx context.Context, id string) (Task, error) {
	return s.q.GetTaskByID(ctx, id)
}
func (s *Store) ListTasks(ctx context.Context) ([]Task, error) {
	return s.q.ListTasks(ctx)
}
func (s *Store) CreateTask(ctx context.Context, p sqlcdb.CreateTaskParams) (Task, error) {
	return s.q.CreateTask(ctx, p)
}
func (s *Store) UpdateTask(ctx context.Context, p sqlcdb.UpdateTaskParams) (Task, error) {
	return s.q.UpdateTask(ctx, p)
}
func (s *Store) UpdateTaskStatus(ctx context.Context, p sqlcdb.UpdateTaskStatusParams) (Task, error) {
	return s.q.UpdateTaskStatus(ctx, p)
}
func (s *Store) DeleteTask(ctx context.Context, id string) error {
	return s.q.DeleteTask(ctx, id)
}

// Calendar Events
func (s *Store) ListCalendarEvents(ctx context.Context) ([]CalendarEvent, error) {
	return s.q.ListCalendarEvents(ctx)
}
func (s *Store) GetCalendarEvent(ctx context.Context, id string) (CalendarEvent, error) {
	return s.q.GetCalendarEvent(ctx, id)
}
func (s *Store) CreateCalendarEvent(ctx context.Context, p sqlcdb.CreateCalendarEventParams) (CalendarEvent, error) {
	return s.q.CreateCalendarEvent(ctx, p)
}
func (s *Store) DeleteCalendarEvent(ctx context.Context, id string) error {
	return s.q.DeleteCalendarEvent(ctx, id)
}
