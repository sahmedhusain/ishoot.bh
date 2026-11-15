package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

func (s *Store) ListITSMTableJSON(ctx context.Context, table, orderBy string) (json.RawMessage, error) {
	var raw []byte
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(json_agg(t ORDER BY `+orderBy+`), '[]'::json) FROM itsm.`+table+` t`).Scan(&raw)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}
	return json.RawMessage(raw), nil
}
