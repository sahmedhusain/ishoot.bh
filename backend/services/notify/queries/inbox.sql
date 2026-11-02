-- name: InsertNotification :execrows
INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, message_key, message_params,
    action_url, entity_type, entity_id, actor, caller, dedupe_key, silent, deliver_at, read_at, archived_at, created_at)
VALUES (@id, @realm, @recipient, @category, @priority, @title, @body, @message_key, @message_params, @action_url,
    @entity_type, @entity_id, @actor, @caller, @dedupe_key, @silent, @deliver_at, @read_at, @archived_at, @created_at)
ON CONFLICT DO NOTHING;

-- name: GetNotification :one
SELECT * FROM notify.notification WHERE id = @id;

-- name: OwnNotification :one
SELECT * FROM notify.notification
WHERE id = @id AND realm = @realm AND recipient = @recipient AND deliver_at <= @now AND category = ANY(@categories::text[]);

-- name: ListNotifications :many
SELECT * FROM notify.notification
WHERE realm = @realm AND recipient = @recipient AND deliver_at <= @now AND category = ANY(@categories::text[])
  AND (sqlc.narg('category')::text IS NULL OR category = sqlc.narg('category'))
  AND CASE @filter::text
        WHEN 'unread' THEN read_at IS NULL AND archived_at IS NULL
        WHEN 'read' THEN read_at IS NOT NULL AND archived_at IS NULL
        WHEN 'archived' THEN archived_at IS NOT NULL
        WHEN 'muted' THEN silent AND archived_at IS NULL
        ELSE archived_at IS NULL
      END
  AND (NOT @has_cursor::boolean OR (deliver_at, id) < (@before_at::timestamptz, @before_id::uuid))
ORDER BY deliver_at DESC, id DESC
LIMIT @page_size;

-- name: UnreadByCategory :many
SELECT category, count(*)::bigint AS unread FROM notify.notification
WHERE realm = @realm AND recipient = @recipient AND deliver_at <= @now AND category = ANY(@categories::text[])
  AND read_at IS NULL AND archived_at IS NULL AND NOT silent
GROUP BY category;

-- name: ChangeNotifications :execrows
UPDATE notify.notification SET
    read_at = CASE @action::text
        WHEN 'read' THEN COALESCE(read_at, @now)
        WHEN 'archive' THEN COALESCE(read_at, @now)
        WHEN 'unread' THEN NULL
        ELSE read_at
    END,
    archived_at = CASE @action::text
        WHEN 'archive' THEN COALESCE(archived_at, @now)
        WHEN 'unarchive' THEN NULL
        ELSE archived_at
    END
WHERE realm = @realm AND recipient = @recipient AND deliver_at <= @now AND category = ANY(@categories::text[])
  AND (sqlc.narg('category')::text IS NULL OR category = sqlc.narg('category'))
  AND (@every::boolean OR id = ANY(@ids::uuid[]))
  AND (NOT @every::boolean OR CASE @filter::text
        WHEN 'unread' THEN read_at IS NULL AND archived_at IS NULL
        WHEN 'read' THEN read_at IS NOT NULL AND archived_at IS NULL
        WHEN 'archived' THEN archived_at IS NOT NULL
        WHEN 'muted' THEN silent AND archived_at IS NULL
        ELSE archived_at IS NULL
      END);

-- name: DeleteNotifications :execrows
DELETE FROM notify.notification
WHERE realm = @realm AND recipient = @recipient AND deliver_at <= @now AND category = ANY(@categories::text[])
  AND (sqlc.narg('category')::text IS NULL OR category = sqlc.narg('category'))
  AND (@every::boolean OR id = ANY(@ids::uuid[]))
  AND (NOT @every::boolean OR CASE @filter::text
        WHEN 'unread' THEN read_at IS NULL AND archived_at IS NULL
        WHEN 'read' THEN read_at IS NOT NULL AND archived_at IS NULL
        WHEN 'archived' THEN archived_at IS NOT NULL
        WHEN 'muted' THEN silent AND archived_at IS NULL
        ELSE archived_at IS NULL
      END);

-- name: PurgeNotifications :execrows
DELETE FROM notify.notification
WHERE created_at < @before AND (read_at IS NOT NULL OR archived_at IS NOT NULL);

-- name: GetPreference :one
SELECT * FROM notify.preference WHERE realm = @realm AND user_id = @user_id;

-- name: UpsertPreference :exec
INSERT INTO notify.preference (realm, user_id, muted_until, sound_enabled, sound, volume, popups_enabled, desktop_enabled, updated_at)
VALUES (@realm, @user_id, @muted_until, @sound_enabled, @sound, @volume, @popups_enabled, @desktop_enabled, @now)
ON CONFLICT (realm, user_id) DO UPDATE SET
    muted_until = EXCLUDED.muted_until, sound_enabled = EXCLUDED.sound_enabled, sound = EXCLUDED.sound,
    volume = EXCLUDED.volume, popups_enabled = EXCLUDED.popups_enabled, desktop_enabled = EXCLUDED.desktop_enabled,
    updated_at = EXCLUDED.updated_at;

-- name: CategorySettings :many
SELECT category, muted, sound FROM notify.category_setting WHERE realm = @realm AND user_id = @user_id ORDER BY category;

-- name: DeleteCategorySettings :exec
DELETE FROM notify.category_setting WHERE realm = @realm AND user_id = @user_id;

-- name: InsertCategorySetting :exec
INSERT INTO notify.category_setting (realm, user_id, category, muted, sound) VALUES (@realm, @user_id, @category, @muted, @sound);

-- name: MutedCategoriesFor :many
SELECT user_id, category FROM notify.category_setting
WHERE realm = @realm AND user_id = ANY(@users::text[]) AND muted;

-- name: ActiveMutesFor :many
SELECT user_id, entity_type, entity_id FROM notify.mute
WHERE realm = @realm AND user_id = ANY(@users::text[]) AND (until IS NULL OR until > @now);

-- name: ListMutes :many
SELECT * FROM notify.mute
WHERE realm = @realm AND user_id = @user_id AND (until IS NULL OR until > @now)
ORDER BY created_at DESC;

-- name: UpsertMute :exec
INSERT INTO notify.mute (realm, user_id, entity_type, entity_id, until, created_at)
VALUES (@realm, @user_id, @entity_type, @entity_id, @until, @now)
ON CONFLICT (realm, user_id, entity_type, entity_id) DO UPDATE SET until = EXCLUDED.until;

-- name: DeleteMute :execrows
DELETE FROM notify.mute WHERE realm = @realm AND user_id = @user_id AND entity_type = @entity_type AND entity_id = @entity_id;

-- name: PurgeMutes :execrows
DELETE FROM notify.mute WHERE until IS NOT NULL AND until < @before;
