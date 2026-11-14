-- +goose Up
CREATE INDEX IF NOT EXISTS idx_event_trace_id ON audit.event (trace_id);

-- +goose Down
DROP INDEX IF EXISTS audit.idx_event_trace_id;
