package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/services/workflow/internal/postgres"
)

func (s *Service) ListContractsFiltered(ctx context.Context, f postgres.ContractFilter) ([]postgres.ContractRecord, error) {
	return s.store.ListContractsFiltered(ctx, f)
}

func (s *Service) GetContractRelational(ctx context.Context, id string) (postgres.ContractRecord, error) {
	c, err := s.store.GetContractRelational(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.ContractRecord{}, ErrNotFound
		}
		return postgres.ContractRecord{}, err
	}
	return c, nil
}

func (s *Service) SaveContractRelational(ctx context.Context, in postgres.ContractRecord) (postgres.ContractRecord, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.ContractNumber == "" {
		in.ContractNumber = "CTR-" + s.now().UTC().Format("20060102") + "-" + in.ID[:6]
	}
	var saved postgres.ContractRecord
	err := s.change(ctx, "workflow.contract.upserted", &saved, func(st *postgres.Store) error {
		var txErr error
		saved, txErr = st.UpsertContractRelational(ctx, in)
		return txErr
	})
	return saved, err
}

func (s *Service) DeleteContractRelational(ctx context.Context, id string) error {
	return s.change(ctx, "workflow.contract.deleted", map[string]string{"id": id}, func(st *postgres.Store) error {
		return st.DeleteContractRelational(ctx, id)
	})
}

func (s *Service) ListOfficialLettersFiltered(ctx context.Context, f postgres.RelationFilter) ([]postgres.OfficialLetterRelational, error) {
	return s.store.ListOfficialLettersFiltered(ctx, f)
}

func (s *Service) CreateOfficialLetterRelational(ctx context.Context, in postgres.OfficialLetterRelational) (postgres.OfficialLetterRelational, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.LetterNumber == "" {
		in.LetterNumber = "LTR-" + s.now().UTC().Format("20060102") + "-" + in.ID[:6]
	}
	var created postgres.OfficialLetterRelational
	err := s.change(ctx, "workflow.letter.created", &created, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateOfficialLetterRelational(ctx, in)
		return txErr
	})
	return created, err
}

func (s *Service) ListSignatureRequestsFiltered(ctx context.Context, f postgres.RelationFilter) ([]postgres.SignatureRequestRelational, error) {
	return s.store.ListSignatureRequestsFiltered(ctx, f)
}

func (s *Service) CreateSignatureRequestRelational(ctx context.Context, in postgres.SignatureRequestRelational) (postgres.SignatureRequestRelational, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.SignatureRequestRelational
	err := s.change(ctx, "workflow.signature.requested", &created, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateSignatureRequestRelational(ctx, in)
		return txErr
	})
	return created, err
}

func (s *Service) ListApprovalRequestsFiltered(ctx context.Context, f postgres.RelationFilter) ([]postgres.ApprovalRequestRelational, error) {
	return s.store.ListApprovalRequestsFiltered(ctx, f)
}

func (s *Service) CreateApprovalRequestRelational(ctx context.Context, in postgres.ApprovalRequestRelational) (postgres.ApprovalRequestRelational, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.ApprovalRequestRelational
	err := s.change(ctx, EventApprovalRequested, &created, func(st *postgres.Store) error {
		var txErr error
		created, txErr = st.CreateApprovalRequestRelational(ctx, in)
		return txErr
	})
	return created, err
}

func (s *Service) ListCalendarEventsFiltered(ctx context.Context, f postgres.RelationFilter) ([]postgres.CalendarEventRelational, error) {
	return s.store.ListCalendarEventsFiltered(ctx, f)
}

func (s *Service) CreateCalendarEventRelational(ctx context.Context, in postgres.CalendarEventRelational) (postgres.CalendarEventRelational, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.EndTime.IsZero() {
		in.EndTime = in.StartTime.Add(time.Hour)
	}
	return s.store.CreateCalendarEventRelational(ctx, in)
}
