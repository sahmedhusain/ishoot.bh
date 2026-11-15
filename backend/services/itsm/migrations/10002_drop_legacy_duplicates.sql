-- +goose Up
DROP TABLE IF EXISTS itsm.company_asset CASCADE;

-- +goose Down
SELECT 1;
