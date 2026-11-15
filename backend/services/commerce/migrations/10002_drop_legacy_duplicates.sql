-- +goose Up
DROP TABLE IF EXISTS commerce.shipment_event CASCADE;
DROP TABLE IF EXISTS commerce.shipment CASCADE;
DROP TABLE IF EXISTS commerce.delivery_slot CASCADE;
DROP TABLE IF EXISTS commerce.delivery_zone CASCADE;
DROP TABLE IF EXISTS commerce.delivery_settings CASCADE;

-- +goose Down
SELECT 1;
