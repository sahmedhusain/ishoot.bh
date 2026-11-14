-- +goose Up
-- Ensure system.service & system.project have clean indexes and non-null defaults
ALTER TABLE system.service ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE system.service ALTER COLUMN is_public SET DEFAULT true;
ALTER TABLE system.service ALTER COLUMN default_rate SET DEFAULT 0;
ALTER TABLE system.service ALTER COLUMN display_order SET DEFAULT 0;
ALTER TABLE system.service ALTER COLUMN is_sample SET DEFAULT false;

UPDATE system.service SET is_active = true WHERE is_active IS NULL;
UPDATE system.service SET is_public = true WHERE is_public IS NULL;
UPDATE system.service SET default_rate = 0 WHERE default_rate IS NULL;
UPDATE system.service SET display_order = 0 WHERE display_order IS NULL;
UPDATE system.service SET is_sample = false WHERE is_sample IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_service_active_order ON system.service (is_active, display_order, name_en);
CREATE INDEX IF NOT EXISTS idx_system_service_category ON system.service (category);

ALTER TABLE system.project ALTER COLUMN status SET DEFAULT 'active';
UPDATE system.project SET status = 'active' WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_project_status ON system.project (status, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS system.idx_system_project_status;
DROP INDEX IF EXISTS system.idx_system_service_category;
DROP INDEX IF EXISTS system.idx_system_service_active_order;
