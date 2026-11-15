-- +goose Up
DROP TABLE IF EXISTS sales.sales_order_event CASCADE;
DROP TABLE IF EXISTS sales.sales_order_line CASCADE;
DROP TABLE IF EXISTS sales.sales_order CASCADE;

-- +goose Down
SELECT 1;
