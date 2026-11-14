-- +goose Up
ALTER TABLE commerce.sales_order ADD COLUMN IF NOT EXISTS shipment_id text;
ALTER TABLE commerce.sales_order ADD COLUMN IF NOT EXISTS shipment_status text;
ALTER TABLE commerce.sales_order ADD COLUMN IF NOT EXISTS tracking_token text;

CREATE INDEX IF NOT EXISTS idx_sales_order_shipment_id ON commerce.sales_order (shipment_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_contact_id ON commerce.sales_order (contact_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_invoice_id ON commerce.sales_order (invoice_id);

CREATE TABLE IF NOT EXISTS commerce.warehouse_ref (
    warehouse_id text PRIMARY KEY,
    code text NOT NULL DEFAULT '',
    name_en text NOT NULL DEFAULT '',
    name_ar text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS commerce.warehouse_ref;
DROP INDEX IF EXISTS commerce.idx_sales_order_invoice_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_contact_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_shipment_id;
ALTER TABLE commerce.sales_order DROP COLUMN IF EXISTS tracking_token;
ALTER TABLE commerce.sales_order DROP COLUMN IF EXISTS shipment_status;
ALTER TABLE commerce.sales_order DROP COLUMN IF EXISTS shipment_id;
