-- +goose Up
ALTER TABLE hr.employee ADD COLUMN IF NOT EXISTS reporting_to text REFERENCES hr.employee(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE hr.employee DROP COLUMN IF EXISTS reporting_to;
