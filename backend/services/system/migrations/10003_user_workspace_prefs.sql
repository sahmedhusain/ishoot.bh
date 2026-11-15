-- +goose Up
-- +goose StatementBegin
ALTER TABLE system.dashboard_layout
  ADD COLUMN IF NOT EXISTS widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scratchpad JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sidebar_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE system.dashboard_layout
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS sidebar_prefs,
  DROP COLUMN IF EXISTS scratchpad,
  DROP COLUMN IF EXISTS widgets;
-- +goose StatementEnd
