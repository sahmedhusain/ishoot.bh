-- +goose Up
DROP TABLE IF EXISTS hr.retail_shift CASCADE;

-- +goose Down
SELECT 1;
