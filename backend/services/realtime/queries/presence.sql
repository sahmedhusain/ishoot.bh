SELECT * FROM realtime.status WHERE realm = @realm AND user_id = @user_id;
SELECT * FROM realtime.status
WHERE realm = @realm AND user_id = ANY(@users::text[]) AND (expires_at IS NULL OR expires_at > @now);
INSERT INTO realtime.status (realm, user_id, status, message, expires_at, updated_at)
VALUES (@realm, @user_id, @status, @message, @expires_at, @now)
ON CONFLICT (realm, user_id) DO UPDATE SET status = EXCLUDED.status, message = EXCLUDED.message,
    expires_at = EXCLUDED.expires_at, updated_at = EXCLUDED.updated_at;
DELETE FROM realtime.status WHERE realm = @realm AND user_id = @user_id;
SELECT * FROM realtime.status_window
WHERE realm = @realm AND user_id = ANY(@users::text[]) AND starts_at <= @now AND ends_at > @now
ORDER BY starts_at;
SELECT * FROM realtime.status_window
WHERE realm = @realm AND user_id = @user_id AND ends_at > @now AND starts_at < @until
ORDER BY starts_at
LIMIT 20;
INSERT INTO realtime.status_window (id, realm, user_id, source, source_id, kind, starts_at, ends_at, updated_at)
VALUES (@id, @realm, @user_id, @source, @source_id, @kind, @starts_at, @ends_at, @now)
ON CONFLICT (realm, user_id, source, source_id) DO UPDATE SET kind = EXCLUDED.kind, starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at, updated_at = EXCLUDED.updated_at;
SELECT user_id FROM realtime.status_window WHERE realm = @realm AND source = @source AND source_id = @source_id;
DELETE FROM realtime.status_window
WHERE realm = @realm AND source = @source AND source_id = @source_id AND NOT (user_id = ANY(@keep::text[]))
RETURNING user_id;
DELETE FROM realtime.status_window
WHERE realm = @realm AND source = @source AND ends_at > @range_start AND starts_at < @range_end
RETURNING user_id;
SELECT DISTINCT realm, user_id FROM (
    SELECT realm, user_id FROM realtime.status_window
    WHERE (starts_at > @since AND starts_at <= @now) OR (ends_at > @since AND ends_at <= @now)
    UNION ALL
    SELECT realm, user_id FROM realtime.status WHERE expires_at > @since AND expires_at <= @now
) changed;
DELETE FROM realtime.status_window WHERE ends_at < @before;
DELETE FROM realtime.status WHERE expires_at < @before;
