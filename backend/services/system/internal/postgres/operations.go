package postgres
import (
	"context"
	"time"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)
func (s *Store) ListAPIKeys(ctx context.Context) ([]sqlcdb.ListAPIKeysRow, error) {
	return s.q.ListAPIKeys(ctx)
}
func (s *Store) InsertAPIKey(ctx context.Context, in sqlcdb.InsertAPIKeyParams) error {
	return s.q.InsertAPIKey(ctx, in)
}
func (s *Store) RevokeAPIKey(ctx context.Context, id string, now time.Time) error {
	return s.q.RevokeAPIKey(ctx, sqlcdb.RevokeAPIKeyParams{ID: id, RevokedAt: &now})
}
func (s *Store) ListBackupRecords(ctx context.Context, limit int32) ([]sqlcdb.SystemBackupRecord, error) {
	return s.q.ListBackupRecords(ctx, limit)
}
func (s *Store) InsertBackupRecord(ctx context.Context, in sqlcdb.InsertBackupRecordParams) error {
	return s.q.InsertBackupRecord(ctx, in)
}
func (s *Store) UpdateBackupStatus(ctx context.Context, in sqlcdb.UpdateBackupStatusParams) error {
	return s.q.UpdateBackupStatus(ctx, in)
}
func (s *Store) ListDebugToggles(ctx context.Context) ([]sqlcdb.SystemDebugToggle, error) {
	return s.q.ListDebugToggles(ctx)
}
func (s *Store) UpsertDebugToggle(ctx context.Context, in sqlcdb.UpsertDebugToggleParams) error {
	return s.q.UpsertDebugToggle(ctx, in)
}
func (s *Store) DeleteDebugToggle(ctx context.Context, service string) error {
	return s.q.DeleteDebugToggle(ctx, service)
}
func (s *Store) GooseVersion(ctx context.Context, schema string) (int64, time.Time, error) {
	var version int64
	var tstamp time.Time
	query := `SELECT version_id, tstamp FROM ` + schema + `.goose_db_version WHERE is_applied = true ORDER BY id DESC LIMIT 1`
	err := s.pool.QueryRow(ctx, query).Scan(&version, &tstamp)
	return version, tstamp, err
}
func (s *Store) OutboxLag(ctx context.Context, schema string) (int64, error) {
	var count int64
	query := `SELECT count(*) FROM ` + schema + `.outbox WHERE published_at IS NULL`
	err := s.pool.QueryRow(ctx, query).Scan(&count)
	return count, err
}
type RiverQueueStat struct {
	Queue	string	`json:"queue"`
	State	string	`json:"state"`
	Count	int64	`json:"count"`
}
func (s *Store) RiverQueueStats(ctx context.Context, schema string) ([]RiverQueueStat, error) {
	query := `SELECT queue, state, count(*) FROM ` + schema + `.river_job GROUP BY queue, state ORDER BY queue, state`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RiverQueueStat
	for rows.Next() {
		var item RiverQueueStat
		if err := rows.Scan(&item.Queue, &item.State, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
