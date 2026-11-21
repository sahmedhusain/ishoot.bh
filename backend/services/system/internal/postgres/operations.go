package postgres
import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
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

const maxDiagnosticQueryRows = 200

var (
	ErrSQLValidation     = errors.New("invalid read-only SQL query")
	singleQuotedSQLRe    = regexp.MustCompile(`'(?:''|[^'])*'`)
	lineCommentSQLRe     = regexp.MustCompile(`--[^\n]*`)
	blockCommentSQLRe    = regexp.MustCompile(`(?s)/\*.*?\*/`)
	forbiddenSQLKeywordRe = regexp.MustCompile(`(?i)\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|CALL|DO|VACUUM|REINDEX|CLUSTER|LOCK|COMMENT|SECURITY|SET|RESET|DISCARD)\b`)
	allowedSQLStartRe    = regexp.MustCompile(`(?i)^(SELECT|WITH|EXPLAIN)\b`)
)

type DatabaseQueryResult struct {
	Columns    []string `json:"columns"`
	Rows       [][]any  `json:"rows"`
	RowCount   int      `json:"rowCount"`
	Truncated  bool     `json:"truncated"`
	DurationMs int64    `json:"durationMs"`
}

type DatabaseMaintenanceResult struct {
	Action       string `json:"action"`
	AffectedRows int64  `json:"affectedRows"`
	DurationMs   int64  `json:"durationMs"`
}

func ValidateReadOnlySQL(raw string) (string, error) {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return "", fmt.Errorf("%w: query cannot be empty", ErrSQLValidation)
	}
	cleaned = strings.TrimRight(strings.TrimSpace(strings.TrimRight(cleaned, ";")), " \t\n\r")
	if cleaned == "" {
		return "", fmt.Errorf("%w: query cannot be empty", ErrSQLValidation)
	}

	scrubbed := blockCommentSQLRe.ReplaceAllString(cleaned, " ")
	scrubbed = lineCommentSQLRe.ReplaceAllString(scrubbed, " ")
	scrubbed = singleQuotedSQLRe.ReplaceAllString(scrubbed, "''")
	scrubbed = strings.TrimSpace(scrubbed)

	if strings.Contains(scrubbed, ";") {
		return "", fmt.Errorf("%w: multiple SQL statements are not allowed", ErrSQLValidation)
	}
	if !allowedSQLStartRe.MatchString(scrubbed) {
		return "", fmt.Errorf("%w: only SELECT, WITH, and EXPLAIN statements are permitted", ErrSQLValidation)
	}
	if forbiddenSQLKeywordRe.MatchString(scrubbed) {
		return "", fmt.Errorf("%w: mutating or DDL keywords are forbidden", ErrSQLValidation)
	}
	return cleaned, nil
}

func formatDiagnosticValue(v any) any {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case string, bool, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return val
	case time.Time:
		return val.UTC().Format(time.RFC3339)
	case [16]byte:
		return fmt.Sprintf("%x-%x-%x-%x-%x", val[0:4], val[4:6], val[6:8], val[8:10], val[10:16])
	case []byte:
		if utf8.Valid(val) {
			return string(val)
		}
		return fmt.Sprintf("<%d bytes>", len(val))
	default:
		return fmt.Sprint(val)
	}
}

func (s *Store) RunReadOnlyQuery(ctx context.Context, sql string) (DatabaseQueryResult, error) {
	cleaned, err := ValidateReadOnlySQL(sql)
	if err != nil {
		return DatabaseQueryResult{}, err
	}

	started := time.Now()
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return DatabaseQueryResult{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, "SET LOCAL statement_timeout = '5000'"); err != nil {
		return DatabaseQueryResult{}, err
	}

	rows, err := tx.Query(ctx, cleaned)
	if err != nil {
		return DatabaseQueryResult{}, err
	}
	defer rows.Close()

	fds := rows.FieldDescriptions()
	cols := make([]string, len(fds))
	for i, fd := range fds {
		cols[i] = fd.Name
	}

	outRows := make([][]any, 0)
	truncated := false
	for rows.Next() {
		if len(outRows) >= maxDiagnosticQueryRows {
			truncated = true
			break
		}
		vals, err := rows.Values()
		if err != nil {
			return DatabaseQueryResult{}, err
		}
		row := make([]any, len(vals))
		for i, v := range vals {
			row[i] = formatDiagnosticValue(v)
		}
		outRows = append(outRows, row)
	}
	if err := rows.Err(); err != nil {
		return DatabaseQueryResult{}, err
	}

	return DatabaseQueryResult{
		Columns:    cols,
		Rows:       outRows,
		RowCount:   len(outRows),
		Truncated:  truncated,
		DurationMs: time.Since(started).Milliseconds(),
	}, nil
}

func (s *Store) RunDatabaseMaintenance(ctx context.Context, action string) (DatabaseMaintenanceResult, error) {
	started := time.Now()
	switch action {
	case "analyze":
		stmts := []string{
			"ANALYZE system.outbox",
			"ANALYZE system.company",
			"ANALYZE system.backup_record",
			"ANALYZE system.module_setting",
			"ANALYZE system.integration_setting",
		}
		for _, stmt := range stmts {
			if _, err := s.pool.Exec(ctx, stmt); err != nil {
				return DatabaseMaintenanceResult{}, err
			}
		}
		return DatabaseMaintenanceResult{
			Action:       action,
			AffectedRows: 0,
			DurationMs:   time.Since(started).Milliseconds(),
		}, nil
	case "purge_outbox":
		tag, err := s.pool.Exec(
			ctx,
			`DELETE FROM system.outbox WHERE published_at IS NOT NULL AND published_at < now() - interval '7 days'`,
		)
		if err != nil {
			return DatabaseMaintenanceResult{}, err
		}
		return DatabaseMaintenanceResult{
			Action:       action,
			AffectedRows: tag.RowsAffected(),
			DurationMs:   time.Since(started).Milliseconds(),
		}, nil
	default:
		return DatabaseMaintenanceResult{}, fmt.Errorf("%w: unsupported maintenance action %q", ErrSQLValidation, action)
	}
}
