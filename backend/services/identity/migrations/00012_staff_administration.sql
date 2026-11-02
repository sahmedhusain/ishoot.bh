-- +goose Up
ALTER TABLE identity.staff_access ADD COLUMN display_name text NOT NULL DEFAULT '';
ALTER TABLE identity.staff_access ADD COLUMN data_scopes jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data_scopes)='object');
-- +goose Down
ALTER TABLE identity.staff_access DROP COLUMN data_scopes;
ALTER TABLE identity.staff_access DROP COLUMN display_name;
