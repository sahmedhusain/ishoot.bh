package app

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Service) Pool() *pgxpool.Pool {
	if s == nil || s.store == nil {
		return nil
	}
	return s.store.Pool()
}

func (s *Service) ListSystemTableJSON(ctx context.Context, table, orderBy string) (json.RawMessage, error) {
	return s.store.ListSystemTableJSON(ctx, table, orderBy)
}

func (s *Service) SavePublicHoliday(ctx context.Context, id, date, nameEn, nameAr string) (json.RawMessage, error) {
	return s.store.SavePublicHoliday(ctx, id, date, nameEn, nameAr)
}

func (s *Service) DeletePublicHoliday(ctx context.Context, id string) error {
	return s.store.DeletePublicHoliday(ctx, id)
}

func (s *Service) SaveHrPolicy(ctx context.Context, rawBody []byte) (json.RawMessage, error) {
	return s.store.SaveHrPolicy(ctx, rawBody)
}
