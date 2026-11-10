package sqlcdb
import (
	"context"
	"time"
)
const activeWindowsFor = `-- name: ActiveWindowsFor :many
SELECT id, realm, user_id, source, source_id, kind, starts_at, ends_at, updated_at FROM realtime.status_window
WHERE realm = $1 AND user_id = ANY($2::text[]) AND starts_at <= $3 AND ends_at > $3
ORDER BY starts_at
`
type ActiveWindowsForParams struct {
	Realm	string
	Users	[]string
	Now	time.Time
}
func (q *Queries) ActiveWindowsFor(ctx context.Context, arg ActiveWindowsForParams) ([]RealtimeStatusWindow, error) {
	rows, err := q.db.Query(ctx, activeWindowsFor, arg.Realm, arg.Users, arg.Now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []RealtimeStatusWindow
	for rows.Next() {
		var i RealtimeStatusWindow
		if err := rows.Scan(
			&i.ID,
			&i.Realm,
			&i.UserID,
			&i.Source,
			&i.SourceID,
			&i.Kind,
			&i.StartsAt,
			&i.EndsAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const deleteSourceRange = `-- name: DeleteSourceRange :many
DELETE FROM realtime.status_window
WHERE realm = $1 AND source = $2 AND ends_at > $3 AND starts_at < $4
RETURNING user_id
`
type DeleteSourceRangeParams struct {
	Realm		string
	Source		string
	RangeStart	time.Time
	RangeEnd	time.Time
}
func (q *Queries) DeleteSourceRange(ctx context.Context, arg DeleteSourceRangeParams) ([]string, error) {
	rows, err := q.db.Query(ctx, deleteSourceRange,
		arg.Realm,
		arg.Source,
		arg.RangeStart,
		arg.RangeEnd,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var user_id string
		if err := rows.Scan(&user_id); err != nil {
			return nil, err
		}
		items = append(items, user_id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const deleteStatus = `-- name: DeleteStatus :execrows
DELETE FROM realtime.status WHERE realm = $1 AND user_id = $2
`
type DeleteStatusParams struct {
	Realm	string
	UserID	string
}
func (q *Queries) DeleteStatus(ctx context.Context, arg DeleteStatusParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteStatus, arg.Realm, arg.UserID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const deleteWindowsExcept = `-- name: DeleteWindowsExcept :many
DELETE FROM realtime.status_window
WHERE realm = $1 AND source = $2 AND source_id = $3 AND NOT (user_id = ANY($4::text[]))
RETURNING user_id
`
type DeleteWindowsExceptParams struct {
	Realm		string
	Source		string
	SourceID	string
	Keep		[]string
}
func (q *Queries) DeleteWindowsExcept(ctx context.Context, arg DeleteWindowsExceptParams) ([]string, error) {
	rows, err := q.db.Query(ctx, deleteWindowsExcept,
		arg.Realm,
		arg.Source,
		arg.SourceID,
		arg.Keep,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var user_id string
		if err := rows.Scan(&user_id); err != nil {
			return nil, err
		}
		items = append(items, user_id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const getStatus = `-- name: GetStatus :one
SELECT realm, user_id, status, message, expires_at, updated_at FROM realtime.status WHERE realm = $1 AND user_id = $2
`
type GetStatusParams struct {
	Realm	string
	UserID	string
}
func (q *Queries) GetStatus(ctx context.Context, arg GetStatusParams) (RealtimeStatus, error) {
	row := q.db.QueryRow(ctx, getStatus, arg.Realm, arg.UserID)
	var i RealtimeStatus
	err := row.Scan(
		&i.Realm,
		&i.UserID,
		&i.Status,
		&i.Message,
		&i.ExpiresAt,
		&i.UpdatedAt,
	)
	return i, err
}
const purgeEnded = `-- name: PurgeEnded :execrows
DELETE FROM realtime.status_window WHERE ends_at < $1
`
func (q *Queries) PurgeEnded(ctx context.Context, before time.Time) (int64, error) {
	result, err := q.db.Exec(ctx, purgeEnded, before)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const purgeExpired = `-- name: PurgeExpired :execrows
DELETE FROM realtime.status WHERE expires_at < $1
`
func (q *Queries) PurgeExpired(ctx context.Context, before *time.Time) (int64, error) {
	result, err := q.db.Exec(ctx, purgeExpired, before)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const statusesFor = `-- name: StatusesFor :many
SELECT realm, user_id, status, message, expires_at, updated_at FROM realtime.status
WHERE realm = $1 AND user_id = ANY($2::text[]) AND (expires_at IS NULL OR expires_at > $3)
`
type StatusesForParams struct {
	Realm	string
	Users	[]string
	Now	*time.Time
}
func (q *Queries) StatusesFor(ctx context.Context, arg StatusesForParams) ([]RealtimeStatus, error) {
	rows, err := q.db.Query(ctx, statusesFor, arg.Realm, arg.Users, arg.Now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []RealtimeStatus
	for rows.Next() {
		var i RealtimeStatus
		if err := rows.Scan(
			&i.Realm,
			&i.UserID,
			&i.Status,
			&i.Message,
			&i.ExpiresAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const transitions = `-- name: Transitions :many
SELECT DISTINCT realm, user_id FROM (
    SELECT realm, user_id FROM realtime.status_window
    WHERE (starts_at > $1 AND starts_at <= $2) OR (ends_at > $1 AND ends_at <= $2)
    UNION ALL
    SELECT realm, user_id FROM realtime.status WHERE expires_at > $1 AND expires_at <= $2
) changed
`
type TransitionsParams struct {
	Since	time.Time
	Now	time.Time
}
type TransitionsRow struct {
	Realm	string
	UserID	string
}
func (q *Queries) Transitions(ctx context.Context, arg TransitionsParams) ([]TransitionsRow, error) {
	rows, err := q.db.Query(ctx, transitions, arg.Since, arg.Now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []TransitionsRow
	for rows.Next() {
		var i TransitionsRow
		if err := rows.Scan(&i.Realm, &i.UserID); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const upcomingWindows = `-- name: UpcomingWindows :many
SELECT id, realm, user_id, source, source_id, kind, starts_at, ends_at, updated_at FROM realtime.status_window
WHERE realm = $1 AND user_id = $2 AND ends_at > $3 AND starts_at < $4
ORDER BY starts_at
LIMIT 20
`
type UpcomingWindowsParams struct {
	Realm	string
	UserID	string
	Now	time.Time
	Until	time.Time
}
func (q *Queries) UpcomingWindows(ctx context.Context, arg UpcomingWindowsParams) ([]RealtimeStatusWindow, error) {
	rows, err := q.db.Query(ctx, upcomingWindows,
		arg.Realm,
		arg.UserID,
		arg.Now,
		arg.Until,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []RealtimeStatusWindow
	for rows.Next() {
		var i RealtimeStatusWindow
		if err := rows.Scan(
			&i.ID,
			&i.Realm,
			&i.UserID,
			&i.Source,
			&i.SourceID,
			&i.Kind,
			&i.StartsAt,
			&i.EndsAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const upsertStatus = `-- name: UpsertStatus :exec
INSERT INTO realtime.status (realm, user_id, status, message, expires_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (realm, user_id) DO UPDATE SET status = EXCLUDED.status, message = EXCLUDED.message,
    expires_at = EXCLUDED.expires_at, updated_at = EXCLUDED.updated_at
`
type UpsertStatusParams struct {
	Realm		string
	UserID		string
	Status		string
	Message		*string
	ExpiresAt	*time.Time
	Now		time.Time
}
func (q *Queries) UpsertStatus(ctx context.Context, arg UpsertStatusParams) error {
	_, err := q.db.Exec(ctx, upsertStatus,
		arg.Realm,
		arg.UserID,
		arg.Status,
		arg.Message,
		arg.ExpiresAt,
		arg.Now,
	)
	return err
}
const upsertWindow = `-- name: UpsertWindow :exec
INSERT INTO realtime.status_window (id, realm, user_id, source, source_id, kind, starts_at, ends_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (realm, user_id, source, source_id) DO UPDATE SET kind = EXCLUDED.kind, starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at, updated_at = EXCLUDED.updated_at
`
type UpsertWindowParams struct {
	ID		string
	Realm		string
	UserID		string
	Source		string
	SourceID	string
	Kind		string
	StartsAt	time.Time
	EndsAt		time.Time
	Now		time.Time
}
func (q *Queries) UpsertWindow(ctx context.Context, arg UpsertWindowParams) error {
	_, err := q.db.Exec(ctx, upsertWindow,
		arg.ID,
		arg.Realm,
		arg.UserID,
		arg.Source,
		arg.SourceID,
		arg.Kind,
		arg.StartsAt,
		arg.EndsAt,
		arg.Now,
	)
	return err
}
const windowUsers = `-- name: WindowUsers :many
SELECT user_id FROM realtime.status_window WHERE realm = $1 AND source = $2 AND source_id = $3
`
type WindowUsersParams struct {
	Realm		string
	Source		string
	SourceID	string
}
func (q *Queries) WindowUsers(ctx context.Context, arg WindowUsersParams) ([]string, error) {
	rows, err := q.db.Query(ctx, windowUsers, arg.Realm, arg.Source, arg.SourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var user_id string
		if err := rows.Scan(&user_id); err != nil {
			return nil, err
		}
		items = append(items, user_id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
