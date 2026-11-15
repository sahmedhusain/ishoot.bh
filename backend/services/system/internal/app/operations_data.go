package app

import (
	"context"

	"platform.local/backend/services/system/internal/postgres"
)

func (s *Service) ListActivityLogs(ctx context.Context, limit int) ([]postgres.ActivityLogRow, error) {
	return s.store.ListActivityLogs(ctx, limit)
}

func (s *Service) CreateActivityLog(ctx context.Context, row postgres.ActivityLogRow) (postgres.ActivityLogRow, error) {
	return s.store.CreateActivityLog(ctx, row)
}

func (s *Service) ListLegalMatters(ctx context.Context) ([]postgres.LegalMatterRow, error) {
	return s.store.ListLegalMatters(ctx)
}

func (s *Service) GetLegalMatter(ctx context.Context, id string) (postgres.LegalMatterRow, error) {
	return s.store.GetLegalMatter(ctx, id)
}

func (s *Service) UpsertLegalMatter(ctx context.Context, row postgres.LegalMatterRow) (postgres.LegalMatterRow, error) {
	return s.store.UpsertLegalMatter(ctx, row)
}

func (s *Service) DeleteLegalMatter(ctx context.Context, id string) error {
	return s.store.DeleteLegalMatter(ctx, id)
}
