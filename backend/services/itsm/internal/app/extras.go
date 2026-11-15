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

func (s *Service) ListITSMTableJSON(ctx context.Context, table, orderBy string) (json.RawMessage, error) {
	return s.store.ListITSMTableJSON(ctx, table, orderBy)
}
