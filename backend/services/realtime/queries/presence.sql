-- name: GetStatus :one
SELECT * FROM realtime.status WHERE realm = @realm AND user_id = @user_id;

-- name: StatusesFor :many
SELECT * FROM realtime.status
WHERE realm = @realm AND user_id = ANY(@users::text[]) AND (expires_at IS NULL OR expires_at > @now);

-- name: UpsertStatus :exec
INSERT INTO realtime.status (realm, user_id, status, message, expires_at, updated_at)
VALUES (@realm, @user_id, @status, @message, @expires_at, @now)
ON CONFLICT (realm, user_id) DO UPDATE SET status = EXCLUDED.status, message = EXCLUDED.message,
    expires_at = EXCLUDED.expires_at, updated_at = EXCLUDED.updated_at;

-- name: DeleteStatus :execrows
DELETE FROM realtime.status WHERE realm = @realm AND user_id = @user_id;

-- name: ActiveWindowsFor :many
SELECT * FROM realtime.status_window
WHERE realm = @realm AND user_id = ANY(@users::text[]) AND starts_at <= @now AND ends_at > @now
ORDER BY starts_at;

-- name: UpcomingWindows :many
SELECT * FROM realtime.status_window
WHERE realm = @realm AND user_id = @user_id AND ends_at > @now AND starts_at < @until
ORDER BY starts_at
LIMIT 20;

-- name: UpsertWindow :exec
INSERT INTO realtime.status_window (id, realm, user_id, source, source_id, kind, starts_at, ends_at, updated_at)
VALUES (@id, @realm, @user_id, @source, @source_id, @kind, @starts_at, @ends_at, @now)
ON CONFLICT (realm, user_id, source, source_id) DO UPDATE SET kind = EXCLUDED.kind, starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at, updated_at = EXCLUDED.updated_at;

-- name: WindowUsers :many
SELECT user_id FROM realtime.status_window WHERE realm = @realm AND source = @source AND source_id = @source_id;

-- name: DeleteWindowsExcept :many
DELETE FROM realtime.status_window
WHERE realm = @realm AND source = @source AND source_id = @source_id AND NOT (user_id = ANY(@keep::text[]))
RETURNING user_id;

-- name: DeleteSourceRange :many
DELETE FROM realtime.status_window
WHERE realm = @realm AND source = @source AND ends_at > @range_start AND starts_at < @range_end
RETURNING user_id;

-- name: Transitions :many
SELECT DISTINCT realm, user_id FROM (
    SELECT realm, user_id FROM realtime.status_window
    WHERE (starts_at > @since AND starts_at <= @now) OR (ends_at > @since AND ends_at <= @now)
    UNION ALL
    SELECT realm, user_id FROM realtime.status WHERE expires_at > @since AND expires_at <= @now
) changed;

-- name: PurgeEnded :execrows
DELETE FROM realtime.status_window WHERE ends_at < @before;

-- name: PurgeExpired :execrows
DELETE FROM realtime.status WHERE expires_at < @before;
