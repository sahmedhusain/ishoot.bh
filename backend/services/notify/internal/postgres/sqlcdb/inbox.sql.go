package sqlcdb
import (
	"context"
	"encoding/json"
	"time"
)
const activeMutesFor = `-- name: ActiveMutesFor :many
SELECT user_id, entity_type, entity_id FROM notify.mute
WHERE realm = $1 AND user_id = ANY($2::text[]) AND (until IS NULL OR until > $3)
`
type ActiveMutesForParams struct {
	Realm	string
	Users	[]string
	Now	*time.Time
}
type ActiveMutesForRow struct {
	UserID		string
	EntityType	string
	EntityID	string
}
func (q *Queries) ActiveMutesFor(ctx context.Context, arg ActiveMutesForParams) ([]ActiveMutesForRow, error) {
	rows, err := q.db.Query(ctx, activeMutesFor, arg.Realm, arg.Users, arg.Now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ActiveMutesForRow
	for rows.Next() {
		var i ActiveMutesForRow
		if err := rows.Scan(&i.UserID, &i.EntityType, &i.EntityID); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const categorySettings = `-- name: CategorySettings :many
SELECT category, muted, sound FROM notify.category_setting WHERE realm = $1 AND user_id = $2 ORDER BY category
`
type CategorySettingsParams struct {
	Realm	string
	UserID	string
}
type CategorySettingsRow struct {
	Category	string
	Muted		bool
	Sound		bool
}
func (q *Queries) CategorySettings(ctx context.Context, arg CategorySettingsParams) ([]CategorySettingsRow, error) {
	rows, err := q.db.Query(ctx, categorySettings, arg.Realm, arg.UserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CategorySettingsRow
	for rows.Next() {
		var i CategorySettingsRow
		if err := rows.Scan(&i.Category, &i.Muted, &i.Sound); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const changeNotifications = `-- name: ChangeNotifications :execrows
UPDATE notify.notification SET
    read_at = CASE $1::text
        WHEN 'read' THEN COALESCE(read_at, $2)
        WHEN 'archive' THEN COALESCE(read_at, $2)
        WHEN 'unread' THEN NULL
        ELSE read_at
    END,
    archived_at = CASE $1::text
        WHEN 'archive' THEN COALESCE(archived_at, $2)
        WHEN 'unarchive' THEN NULL
        ELSE archived_at
    END
WHERE realm = $3 AND recipient = $4 AND deliver_at <= $2 AND category = ANY($5::text[])
  AND ($6::text IS NULL OR category = $6)
  AND ($7::boolean OR id = ANY($8::uuid[]))
  AND (NOT $7::boolean OR CASE $9::text
        WHEN 'unread' THEN read_at IS NULL AND archived_at IS NULL
        WHEN 'read' THEN read_at IS NOT NULL AND archived_at IS NULL
        WHEN 'archived' THEN archived_at IS NOT NULL
        WHEN 'muted' THEN silent AND archived_at IS NULL
        ELSE archived_at IS NULL
      END)
`
type ChangeNotificationsParams struct {
	Action		string
	Now		*time.Time
	Realm		string
	Recipient	string
	Categories	[]string
	Category	*string
	Every		bool
	Ids		[]string
	Filter		string
}
func (q *Queries) ChangeNotifications(ctx context.Context, arg ChangeNotificationsParams) (int64, error) {
	result, err := q.db.Exec(ctx, changeNotifications,
		arg.Action,
		arg.Now,
		arg.Realm,
		arg.Recipient,
		arg.Categories,
		arg.Category,
		arg.Every,
		arg.Ids,
		arg.Filter,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const deleteCategorySettings = `-- name: DeleteCategorySettings :exec
DELETE FROM notify.category_setting WHERE realm = $1 AND user_id = $2
`
type DeleteCategorySettingsParams struct {
	Realm	string
	UserID	string
}
func (q *Queries) DeleteCategorySettings(ctx context.Context, arg DeleteCategorySettingsParams) error {
	_, err := q.db.Exec(ctx, deleteCategorySettings, arg.Realm, arg.UserID)
	return err
}
const deleteMute = `-- name: DeleteMute :execrows
DELETE FROM notify.mute WHERE realm = $1 AND user_id = $2 AND entity_type = $3 AND entity_id = $4
`
type DeleteMuteParams struct {
	Realm		string
	UserID		string
	EntityType	string
	EntityID	string
}
func (q *Queries) DeleteMute(ctx context.Context, arg DeleteMuteParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteMute,
		arg.Realm,
		arg.UserID,
		arg.EntityType,
		arg.EntityID,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const deleteNotifications = `-- name: DeleteNotifications :execrows
DELETE FROM notify.notification
WHERE realm = $1 AND recipient = $2 AND deliver_at <= $3 AND category = ANY($4::text[])
  AND ($5::text IS NULL OR category = $5)
  AND ($6::boolean OR id = ANY($7::uuid[]))
  AND (NOT $6::boolean OR CASE $8::text
        WHEN 'unread' THEN read_at IS NULL AND archived_at IS NULL
        WHEN 'read' THEN read_at IS NOT NULL AND archived_at IS NULL
        WHEN 'archived' THEN archived_at IS NOT NULL
        WHEN 'muted' THEN silent AND archived_at IS NULL
        ELSE archived_at IS NULL
      END)
`
type DeleteNotificationsParams struct {
	Realm		string
	Recipient	string
	Now		time.Time
	Categories	[]string
	Category	*string
	Every		bool
	Ids		[]string
	Filter		string
}
func (q *Queries) DeleteNotifications(ctx context.Context, arg DeleteNotificationsParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteNotifications,
		arg.Realm,
		arg.Recipient,
		arg.Now,
		arg.Categories,
		arg.Category,
		arg.Every,
		arg.Ids,
		arg.Filter,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const getNotification = `-- name: GetNotification :one
SELECT id, realm, recipient, category, priority, title, body, message_key, message_params, action_url, entity_type, entity_id, actor, caller, dedupe_key, silent, deliver_at, read_at, archived_at, created_at FROM notify.notification WHERE id = $1
`
func (q *Queries) GetNotification(ctx context.Context, id string) (NotifyNotification, error) {
	row := q.db.QueryRow(ctx, getNotification, id)
	var i NotifyNotification
	err := row.Scan(
		&i.ID,
		&i.Realm,
		&i.Recipient,
		&i.Category,
		&i.Priority,
		&i.Title,
		&i.Body,
		&i.MessageKey,
		&i.MessageParams,
		&i.ActionUrl,
		&i.EntityType,
		&i.EntityID,
		&i.Actor,
		&i.Caller,
		&i.DedupeKey,
		&i.Silent,
		&i.DeliverAt,
		&i.ReadAt,
		&i.ArchivedAt,
		&i.CreatedAt,
	)
	return i, err
}
const getPreference = `-- name: GetPreference :one
SELECT realm, user_id, muted_until, sound_enabled, sound, volume, popups_enabled, desktop_enabled, updated_at FROM notify.preference WHERE realm = $1 AND user_id = $2
`
type GetPreferenceParams struct {
	Realm	string
	UserID	string
}
func (q *Queries) GetPreference(ctx context.Context, arg GetPreferenceParams) (NotifyPreference, error) {
	row := q.db.QueryRow(ctx, getPreference, arg.Realm, arg.UserID)
	var i NotifyPreference
	err := row.Scan(
		&i.Realm,
		&i.UserID,
		&i.MutedUntil,
		&i.SoundEnabled,
		&i.Sound,
		&i.Volume,
		&i.PopupsEnabled,
		&i.DesktopEnabled,
		&i.UpdatedAt,
	)
	return i, err
}
const insertCategorySetting = `-- name: InsertCategorySetting :exec
INSERT INTO notify.category_setting (realm, user_id, category, muted, sound) VALUES ($1, $2, $3, $4, $5)
`
type InsertCategorySettingParams struct {
	Realm		string
	UserID		string
	Category	string
	Muted		bool
	Sound		bool
}
func (q *Queries) InsertCategorySetting(ctx context.Context, arg InsertCategorySettingParams) error {
	_, err := q.db.Exec(ctx, insertCategorySetting,
		arg.Realm,
		arg.UserID,
		arg.Category,
		arg.Muted,
		arg.Sound,
	)
	return err
}
const insertNotification = `-- name: InsertNotification :execrows
INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, message_key, message_params,
    action_url, entity_type, entity_id, actor, caller, dedupe_key, silent, deliver_at, read_at, archived_at, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
ON CONFLICT DO NOTHING
`
type InsertNotificationParams struct {
	ID		string
	Realm		string
	Recipient	string
	Category	string
	Priority	string
	Title		string
	Body		string
	MessageKey	*string
	MessageParams	json.RawMessage
	ActionUrl	*string
	EntityType	*string
	EntityID	*string
	Actor		*string
	Caller		string
	DedupeKey	*string
	Silent		bool
	DeliverAt	time.Time
	ReadAt		*time.Time
	ArchivedAt	*time.Time
	CreatedAt	time.Time
}
func (q *Queries) InsertNotification(ctx context.Context, arg InsertNotificationParams) (int64, error) {
	result, err := q.db.Exec(ctx, insertNotification,
		arg.ID,
		arg.Realm,
		arg.Recipient,
		arg.Category,
		arg.Priority,
		arg.Title,
		arg.Body,
		arg.MessageKey,
		arg.MessageParams,
		arg.ActionUrl,
		arg.EntityType,
		arg.EntityID,
		arg.Actor,
		arg.Caller,
		arg.DedupeKey,
		arg.Silent,
		arg.DeliverAt,
		arg.ReadAt,
		arg.ArchivedAt,
		arg.CreatedAt,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const listMutes = `-- name: ListMutes :many
SELECT realm, user_id, entity_type, entity_id, until, created_at FROM notify.mute
WHERE realm = $1 AND user_id = $2 AND (until IS NULL OR until > $3)
ORDER BY created_at DESC
`
type ListMutesParams struct {
	Realm	string
	UserID	string
	Now	*time.Time
}
func (q *Queries) ListMutes(ctx context.Context, arg ListMutesParams) ([]NotifyMute, error) {
	rows, err := q.db.Query(ctx, listMutes, arg.Realm, arg.UserID, arg.Now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []NotifyMute
	for rows.Next() {
		var i NotifyMute
		if err := rows.Scan(
			&i.Realm,
			&i.UserID,
			&i.EntityType,
			&i.EntityID,
			&i.Until,
			&i.CreatedAt,
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
const listNotifications = `-- name: ListNotifications :many
SELECT id, realm, recipient, category, priority, title, body, message_key, message_params, action_url, entity_type, entity_id, actor, caller, dedupe_key, silent, deliver_at, read_at, archived_at, created_at FROM notify.notification
WHERE realm = $1 AND recipient = $2 AND deliver_at <= $3 AND category = ANY($4::text[])
  AND ($5::text IS NULL OR category = $5)
  AND CASE $6::text
        WHEN 'unread' THEN read_at IS NULL AND archived_at IS NULL
        WHEN 'read' THEN read_at IS NOT NULL AND archived_at IS NULL
        WHEN 'archived' THEN archived_at IS NOT NULL
        WHEN 'muted' THEN silent AND archived_at IS NULL
        ELSE archived_at IS NULL
      END
  AND (NOT $7::boolean OR (deliver_at, id) < ($8::timestamptz, $9::uuid))
ORDER BY deliver_at DESC, id DESC
LIMIT $10
`
type ListNotificationsParams struct {
	Realm		string
	Recipient	string
	Now		time.Time
	Categories	[]string
	Category	*string
	Filter		string
	HasCursor	bool
	BeforeAt	time.Time
	BeforeID	string
	PageSize	int32
}
func (q *Queries) ListNotifications(ctx context.Context, arg ListNotificationsParams) ([]NotifyNotification, error) {
	rows, err := q.db.Query(ctx, listNotifications,
		arg.Realm,
		arg.Recipient,
		arg.Now,
		arg.Categories,
		arg.Category,
		arg.Filter,
		arg.HasCursor,
		arg.BeforeAt,
		arg.BeforeID,
		arg.PageSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []NotifyNotification
	for rows.Next() {
		var i NotifyNotification
		if err := rows.Scan(
			&i.ID,
			&i.Realm,
			&i.Recipient,
			&i.Category,
			&i.Priority,
			&i.Title,
			&i.Body,
			&i.MessageKey,
			&i.MessageParams,
			&i.ActionUrl,
			&i.EntityType,
			&i.EntityID,
			&i.Actor,
			&i.Caller,
			&i.DedupeKey,
			&i.Silent,
			&i.DeliverAt,
			&i.ReadAt,
			&i.ArchivedAt,
			&i.CreatedAt,
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
const mutedCategoriesFor = `-- name: MutedCategoriesFor :many
SELECT user_id, category FROM notify.category_setting
WHERE realm = $1 AND user_id = ANY($2::text[]) AND muted
`
type MutedCategoriesForParams struct {
	Realm	string
	Users	[]string
}
type MutedCategoriesForRow struct {
	UserID		string
	Category	string
}
func (q *Queries) MutedCategoriesFor(ctx context.Context, arg MutedCategoriesForParams) ([]MutedCategoriesForRow, error) {
	rows, err := q.db.Query(ctx, mutedCategoriesFor, arg.Realm, arg.Users)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []MutedCategoriesForRow
	for rows.Next() {
		var i MutedCategoriesForRow
		if err := rows.Scan(&i.UserID, &i.Category); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const ownNotification = `-- name: OwnNotification :one
SELECT id, realm, recipient, category, priority, title, body, message_key, message_params, action_url, entity_type, entity_id, actor, caller, dedupe_key, silent, deliver_at, read_at, archived_at, created_at FROM notify.notification
WHERE id = $1 AND realm = $2 AND recipient = $3 AND deliver_at <= $4 AND category = ANY($5::text[])
`
type OwnNotificationParams struct {
	ID		string
	Realm		string
	Recipient	string
	Now		time.Time
	Categories	[]string
}
func (q *Queries) OwnNotification(ctx context.Context, arg OwnNotificationParams) (NotifyNotification, error) {
	row := q.db.QueryRow(ctx, ownNotification,
		arg.ID,
		arg.Realm,
		arg.Recipient,
		arg.Now,
		arg.Categories,
	)
	var i NotifyNotification
	err := row.Scan(
		&i.ID,
		&i.Realm,
		&i.Recipient,
		&i.Category,
		&i.Priority,
		&i.Title,
		&i.Body,
		&i.MessageKey,
		&i.MessageParams,
		&i.ActionUrl,
		&i.EntityType,
		&i.EntityID,
		&i.Actor,
		&i.Caller,
		&i.DedupeKey,
		&i.Silent,
		&i.DeliverAt,
		&i.ReadAt,
		&i.ArchivedAt,
		&i.CreatedAt,
	)
	return i, err
}
const purgeMutes = `-- name: PurgeMutes :execrows
DELETE FROM notify.mute WHERE until IS NOT NULL AND until < $1
`
func (q *Queries) PurgeMutes(ctx context.Context, before *time.Time) (int64, error) {
	result, err := q.db.Exec(ctx, purgeMutes, before)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const purgeNotifications = `-- name: PurgeNotifications :execrows
DELETE FROM notify.notification
WHERE created_at < $1 AND (read_at IS NOT NULL OR archived_at IS NOT NULL)
`
func (q *Queries) PurgeNotifications(ctx context.Context, before time.Time) (int64, error) {
	result, err := q.db.Exec(ctx, purgeNotifications, before)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const unreadByCategory = `-- name: UnreadByCategory :many
SELECT category, count(*)::bigint AS unread FROM notify.notification
WHERE realm = $1 AND recipient = $2 AND deliver_at <= $3 AND category = ANY($4::text[])
  AND read_at IS NULL AND archived_at IS NULL AND NOT silent
GROUP BY category
`
type UnreadByCategoryParams struct {
	Realm		string
	Recipient	string
	Now		time.Time
	Categories	[]string
}
type UnreadByCategoryRow struct {
	Category	string
	Unread		int64
}
func (q *Queries) UnreadByCategory(ctx context.Context, arg UnreadByCategoryParams) ([]UnreadByCategoryRow, error) {
	rows, err := q.db.Query(ctx, unreadByCategory,
		arg.Realm,
		arg.Recipient,
		arg.Now,
		arg.Categories,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []UnreadByCategoryRow
	for rows.Next() {
		var i UnreadByCategoryRow
		if err := rows.Scan(&i.Category, &i.Unread); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
const upsertMute = `-- name: UpsertMute :exec
INSERT INTO notify.mute (realm, user_id, entity_type, entity_id, until, created_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (realm, user_id, entity_type, entity_id) DO UPDATE SET until = EXCLUDED.until
`
type UpsertMuteParams struct {
	Realm		string
	UserID		string
	EntityType	string
	EntityID	string
	Until		*time.Time
	Now		time.Time
}
func (q *Queries) UpsertMute(ctx context.Context, arg UpsertMuteParams) error {
	_, err := q.db.Exec(ctx, upsertMute,
		arg.Realm,
		arg.UserID,
		arg.EntityType,
		arg.EntityID,
		arg.Until,
		arg.Now,
	)
	return err
}
const upsertPreference = `-- name: UpsertPreference :exec
INSERT INTO notify.preference (realm, user_id, muted_until, sound_enabled, sound, volume, popups_enabled, desktop_enabled, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (realm, user_id) DO UPDATE SET
    muted_until = EXCLUDED.muted_until, sound_enabled = EXCLUDED.sound_enabled, sound = EXCLUDED.sound,
    volume = EXCLUDED.volume, popups_enabled = EXCLUDED.popups_enabled, desktop_enabled = EXCLUDED.desktop_enabled,
    updated_at = EXCLUDED.updated_at
`
type UpsertPreferenceParams struct {
	Realm		string
	UserID		string
	MutedUntil	*time.Time
	SoundEnabled	bool
	Sound		string
	Volume		int16
	PopupsEnabled	bool
	DesktopEnabled	bool
	Now		time.Time
}
func (q *Queries) UpsertPreference(ctx context.Context, arg UpsertPreferenceParams) error {
	_, err := q.db.Exec(ctx, upsertPreference,
		arg.Realm,
		arg.UserID,
		arg.MutedUntil,
		arg.SoundEnabled,
		arg.Sound,
		arg.Volume,
		arg.PopupsEnabled,
		arg.DesktopEnabled,
		arg.Now,
	)
	return err
}
