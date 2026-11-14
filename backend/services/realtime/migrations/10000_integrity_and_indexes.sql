-- +goose Up
CREATE INDEX IF NOT EXISTS idx_status_user_id ON realtime.status (user_id);
CREATE INDEX IF NOT EXISTS idx_status_window_user_id ON realtime.status_window (user_id);
CREATE INDEX IF NOT EXISTS idx_status_window_source_id ON realtime.status_window (source_id);

-- +goose Down
DROP INDEX IF EXISTS realtime.idx_status_user_id;
DROP INDEX IF EXISTS realtime.idx_status_window_user_id;
DROP INDEX IF EXISTS realtime.idx_status_window_source_id;
