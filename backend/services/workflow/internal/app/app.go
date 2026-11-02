// Package app holds the workflow service's use cases.
package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/workflow/internal/postgres"
	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
)

var (
	ErrNotFound = errors.New("workflow resource not found")
	ErrConflict = errors.New("workflow resource conflict")
)

const (
	EventApprovalRequested = "workflow.approval.requested"
	EventApprovalDecided   = "workflow.approval.decided"
	EventDocumentSigned    = "workflow.document.signed"
)

type Service struct {
	store *postgres.Store
	now   func() time.Time
}

func New(store *postgres.Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
	}
}

func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}

// Approvals
type ApprovalRequestWithDecisions struct {
	postgres.ApprovalRequest
	Decisions []postgres.ApprovalDecision `json:"decisions"`
}

func (s *Service) GetApprovalRequest(ctx context.Context, id string) (ApprovalRequestWithDecisions, error) {
	req, err := s.store.GetApprovalRequestByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ApprovalRequestWithDecisions{}, ErrNotFound
		}
		return ApprovalRequestWithDecisions{}, err
	}
	decisions, err := s.store.ListApprovalDecisions(ctx, req.ID)
	if err != nil {
		return ApprovalRequestWithDecisions{}, err
	}
	return ApprovalRequestWithDecisions{ApprovalRequest: req, Decisions: decisions}, nil
}

func (s *Service) ListApprovalRequests(ctx context.Context) ([]postgres.ApprovalRequest, error) {
	return s.store.ListApprovalRequests(ctx)
}

func (s *Service) CreateApprovalRequest(ctx context.Context, in sqlcdb.CreateApprovalRequestParams) (postgres.ApprovalRequest, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.ApprovalRequest
	err := s.change(ctx, EventApprovalRequested, map[string]string{
		"requestId": in.ID,
		"kind":      in.Kind,
		"entityId":  in.EntityID,
	}, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateApprovalRequest(ctx, in)
		return txErr
	})
	return created, err
}

func (s *Service) DecideApproval(ctx context.Context, requestID string, approverID string, decision string, comments *string) (postgres.ApprovalDecision, error) {
	var created postgres.ApprovalDecision
	err := s.change(ctx, EventApprovalDecided, map[string]string{
		"requestId":  requestID,
		"approverId": approverID,
		"decision":   decision,
	}, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateApprovalDecision(ctx, sqlcdb.CreateApprovalDecisionParams{
			ID:         uuid.NewString(),
			RequestID:  requestID,
			ApproverID: approverID,
			Decision:   decision,
			Comments:   comments,
		})
		if txErr != nil {
			return txErr
		}
		newStatus := "approved"
		if decision == "reject" {
			newStatus = "rejected"
		}
		_, txErr = st.UpdateApprovalRequestStatus(ctx, sqlcdb.UpdateApprovalRequestStatusParams{
			ID:     requestID,
			Status: newStatus,
		})
		return txErr
	})
	return created, err
}

// Signatures
func (s *Service) GetSignatureRequest(ctx context.Context, id string) (postgres.SignatureRequest, error) {
	sr, err := s.store.GetSignatureRequestByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.SignatureRequest{}, ErrNotFound
		}
		return postgres.SignatureRequest{}, err
	}
	return sr, nil
}

func (s *Service) ListSignatureRequests(ctx context.Context) ([]postgres.SignatureRequest, error) {
	return s.store.ListSignatureRequests(ctx)
}

func (s *Service) CreateSignatureRequest(ctx context.Context, in sqlcdb.CreateSignatureRequestParams) (postgres.SignatureRequest, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateSignatureRequest(ctx, in)
}

func (s *Service) RecordSignature(ctx context.Context, id string, signatureURL *string) (postgres.SignatureRequest, error) {
	var updated postgres.SignatureRequest
	err := s.change(ctx, EventDocumentSigned, map[string]string{"signatureRequestId": id}, func(st *postgres.Store) error {
		var txErr error
		updated, txErr = st.RecordSignature(ctx, sqlcdb.RecordSignatureParams{
			ID:           id,
			SignatureUrl: signatureURL,
		})
		return txErr
	})
	return updated, err
}

// Letters
func (s *Service) ListLetterTemplates(ctx context.Context) ([]postgres.LetterTemplate, error) {
	return s.store.ListLetterTemplates(ctx)
}

func (s *Service) CreateLetterTemplate(ctx context.Context, in sqlcdb.CreateLetterTemplateParams) (postgres.LetterTemplate, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateLetterTemplate(ctx, in)
}

func (s *Service) ListOfficialLetters(ctx context.Context) ([]postgres.OfficialLetter, error) {
	return s.store.ListOfficialLetters(ctx)
}

func (s *Service) GetOfficialLetter(ctx context.Context, id string) (postgres.OfficialLetter, error) {
	letter, err := s.store.GetOfficialLetter(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.OfficialLetter{}, ErrNotFound
		}
		return postgres.OfficialLetter{}, err
	}
	return letter, nil
}

func (s *Service) CreateOfficialLetter(ctx context.Context, in sqlcdb.CreateOfficialLetterParams) (postgres.OfficialLetter, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateOfficialLetter(ctx, in)
}

func (s *Service) IssueOfficialLetter(ctx context.Context, id string) (postgres.OfficialLetter, error) {
	return s.store.UpdateOfficialLetterStatus(ctx, sqlcdb.UpdateOfficialLetterStatusParams{
		ID:     id,
		Status: "issued",
	})
}

// MOM
func (s *Service) ListMOMs(ctx context.Context) ([]postgres.MinuteOfMeeting, error) {
	return s.store.ListMOMs(ctx)
}

func (s *Service) GetMOM(ctx context.Context, id string) (postgres.MinuteOfMeeting, error) {
	mom, err := s.store.GetMOM(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.MinuteOfMeeting{}, ErrNotFound
		}
		return postgres.MinuteOfMeeting{}, err
	}
	return mom, nil
}

func (s *Service) CreateMOM(ctx context.Context, in sqlcdb.CreateMOMParams) (postgres.MinuteOfMeeting, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateMOM(ctx, in)
}

func (s *Service) UpdateMOM(ctx context.Context, in sqlcdb.UpdateMOMParams) (postgres.MinuteOfMeeting, error) {
	return s.store.UpdateMOM(ctx, in)
}

// Tasks
func (s *Service) GetTask(ctx context.Context, id string) (postgres.Task, error) {
	t, err := s.store.GetTaskByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Task{}, ErrNotFound
		}
		return postgres.Task{}, err
	}
	return t, nil
}

func (s *Service) ListTasks(ctx context.Context) ([]postgres.Task, error) {
	return s.store.ListTasks(ctx)
}

func (s *Service) CreateTask(ctx context.Context, in sqlcdb.CreateTaskParams) (postgres.Task, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateTask(ctx, in)
}

func (s *Service) UpdateTask(ctx context.Context, in sqlcdb.UpdateTaskParams) (postgres.Task, error) {
	return s.store.UpdateTask(ctx, in)
}

func (s *Service) UpdateTaskStatus(ctx context.Context, id string, status string) (postgres.Task, error) {
	return s.store.UpdateTaskStatus(ctx, sqlcdb.UpdateTaskStatusParams{
		ID:     id,
		Status: status,
	})
}

func (s *Service) DeleteTask(ctx context.Context, id string) error {
	return s.store.DeleteTask(ctx, id)
}

// Calendar Events
func (s *Service) ListCalendarEvents(ctx context.Context) ([]postgres.CalendarEvent, error) {
	return s.store.ListCalendarEvents(ctx)
}

func (s *Service) GetCalendarEvent(ctx context.Context, id string) (postgres.CalendarEvent, error) {
	ce, err := s.store.GetCalendarEvent(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.CalendarEvent{}, ErrNotFound
		}
		return postgres.CalendarEvent{}, err
	}
	return ce, nil
}

func (s *Service) CreateCalendarEvent(ctx context.Context, in sqlcdb.CreateCalendarEventParams) (postgres.CalendarEvent, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateCalendarEvent(ctx, in)
}

func (s *Service) DeleteCalendarEvent(ctx context.Context, id string) error {
	return s.store.DeleteCalendarEvent(ctx, id)
}
