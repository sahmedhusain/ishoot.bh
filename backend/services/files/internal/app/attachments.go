package app

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"platform.local/backend/services/files/internal/domain"
	"platform.local/backend/services/files/internal/postgres"
)

// AttachmentRepository extends Repository when backed by Postgres without breaking in-memory test fakes.
type AttachmentRepository interface {
	InsertAttachment(ctx context.Context, in postgres.EntityAttachment) (postgres.EntityAttachment, error)
	ListAttachments(ctx context.Context, f postgres.AttachmentFilter) ([]postgres.EntityAttachment, error)
	DeleteAttachment(ctx context.Context, id string) (bool, error)
}

func (s *Service) CreateAttachment(ctx context.Context, in postgres.EntityAttachment) (postgres.EntityAttachment, error) {
	ar, ok := s.repo.(AttachmentRepository)
	if !ok {
		return postgres.EntityAttachment{}, domain.ErrUnavailable
	}
	in.EntityType = strings.TrimSpace(in.EntityType)
	in.EntityID = strings.TrimSpace(in.EntityID)
	in.FileURL = strings.TrimSpace(in.FileURL)
	in.FileName = strings.TrimSpace(in.FileName)
	if in.EntityType == "" || in.EntityID == "" || in.FileURL == "" {
		return postgres.EntityAttachment{}, domain.ErrInvalidURL
	}
	if in.FileName == "" {
		parts := strings.Split(in.FileURL, "/")
		in.FileName = parts[len(parts)-1]
	}
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return ar.InsertAttachment(ctx, in)
}

func (s *Service) ListAttachments(ctx context.Context, f postgres.AttachmentFilter) ([]postgres.EntityAttachment, error) {
	ar, ok := s.repo.(AttachmentRepository)
	if !ok {
		return []postgres.EntityAttachment{}, nil
	}
	return ar.ListAttachments(ctx, f)
}

func (s *Service) DeleteAttachment(ctx context.Context, id string) error {
	ar, ok := s.repo.(AttachmentRepository)
	if !ok {
		return domain.ErrNotFound
	}
	deleted, err := ar.DeleteAttachment(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return domain.ErrNotFound
	}
	return nil
}
