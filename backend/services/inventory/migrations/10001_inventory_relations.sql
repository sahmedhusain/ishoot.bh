-- +goose Up
ALTER TABLE inventory.purchase_order ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE inventory.purchase_order ADD COLUMN IF NOT EXISTS document_id text;
CREATE INDEX IF NOT EXISTS idx_purchase_order_document_id ON inventory.purchase_order (document_id);

-- +goose Down
DROP INDEX IF EXISTS inventory.idx_purchase_order_document_id;
ALTER TABLE inventory.purchase_order DROP COLUMN IF EXISTS document_id;
ALTER TABLE inventory.purchase_order DROP COLUMN IF EXISTS supplier_name;
