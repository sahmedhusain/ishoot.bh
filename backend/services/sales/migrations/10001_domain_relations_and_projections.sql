-- +goose Up
-- Connect sales.deal directly to sales.deal_pipeline_stage
ALTER TABLE sales.deal ADD COLUMN IF NOT EXISTS pipeline_stage_id text;
UPDATE sales.deal d
SET pipeline_stage_id = s.id
FROM sales.deal_pipeline_stage s
WHERE d.pipeline_stage_id IS NULL AND (d.stage = s.id OR lower(d.stage) = lower(s.name_en));

-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deal_pipeline_stage' AND conrelid = 'sales.deal'::regclass) THEN
        ALTER TABLE sales.deal ADD CONSTRAINT fk_deal_pipeline_stage FOREIGN KEY (pipeline_stage_id) REFERENCES sales.deal_pipeline_stage(id) ON DELETE SET NULL;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_stage_id ON sales.deal (pipeline_stage_id);

-- Synchronize sales.quotation legacy/new dual columns
UPDATE sales.quotation
SET
    contact_id = COALESCE(contact_id, client_id),
    client_id = COALESCE(client_id, contact_id),
    total = CASE WHEN total = 0 AND total_amount IS NOT NULL THEN total_amount ELSE total END,
    total_amount = COALESCE(total_amount, total),
    vat_rate = CASE WHEN vat_rate = 0 AND vat_percentage IS NOT NULL THEN vat_percentage ELSE vat_rate END,
    vat_percentage = COALESCE(vat_percentage, vat_rate),
    discount = CASE WHEN discount = 0 AND discount_amount IS NOT NULL THEN discount_amount ELSE discount END,
    discount_amount = COALESCE(discount_amount, discount);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION sales.sync_quotation_dual_columns() RETURNS trigger AS $$
BEGIN
    IF NEW.contact_id IS NULL AND NEW.client_id IS NOT NULL THEN
        NEW.contact_id := NEW.client_id;
    ELSIF NEW.client_id IS NULL AND NEW.contact_id IS NOT NULL THEN
        NEW.client_id := NEW.contact_id;
    END IF;
    IF NEW.total_amount IS NULL THEN
        NEW.total_amount := NEW.total;
    END IF;
    IF NEW.vat_percentage IS NULL THEN
        NEW.vat_percentage := NEW.vat_rate;
    END IF;
    IF NEW.discount_amount IS NULL THEN
        NEW.discount_amount := NEW.discount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_sales_quotation_sync ON sales.quotation;
CREATE TRIGGER trg_sales_quotation_sync
    BEFORE INSERT OR UPDATE ON sales.quotation
    FOR EACH ROW EXECUTE FUNCTION sales.sync_quotation_dual_columns();

-- Upgrade sales.quotation_item to link catalog services & inventory products + bilingual descriptions
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'custom';
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS service_id text;
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS variant_id text;
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '';
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '';
ALTER TABLE sales.quotation_item ADD COLUMN IF NOT EXISTS tax_rate numeric(5, 2) NOT NULL DEFAULT 0;

UPDATE sales.quotation_item SET description_en = description WHERE description_en = '' AND description <> '';

INSERT INTO sales.quotation_item (id, quotation_id, item_kind, description, description_en, description_ar, quantity, unit_price, amount, sort_order)
SELECT
    li.id,
    li.quotation_id,
    'custom',
    COALESCE(NULLIF(li.description_en, ''), COALESCE(li.description_ar, 'Item')),
    COALESCE(li.description_en, ''),
    COALESCE(li.description_ar, ''),
    COALESCE(li.quantity, 1),
    COALESCE(li.unit_price, 0),
    COALESCE(li.line_total, 0),
    COALESCE(li.order_index, 0)
FROM sales.quotation_line_item li
WHERE li.quotation_id IN (SELECT id FROM sales.quotation)
  AND NOT EXISTS (SELECT 1 FROM sales.quotation_item qi WHERE qi.id = li.id)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_quotation_item_service_id ON sales.quotation_item (service_id);
CREATE INDEX IF NOT EXISTS idx_quotation_item_product_id ON sales.quotation_item (product_id);

-- Cross-service read-model cache of sellable services and inventory products
CREATE TABLE IF NOT EXISTS sales.catalog_item_ref (
    kind text NOT NULL CHECK (kind IN ('service', 'product')),
    id text NOT NULL,
    variant_id text NOT NULL DEFAULT '',
    sku text,
    name_en text NOT NULL,
    name_ar text NOT NULL DEFAULT '',
    unit text NOT NULL DEFAULT 'unit',
    unit_price numeric(14, 3) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'BHD',
    tax_rate numeric(5, 2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_sales_catalog_item_active ON sales.catalog_item_ref (is_active, kind);

-- +goose Down
DROP TABLE IF EXISTS sales.catalog_item_ref;
DROP INDEX IF EXISTS sales.idx_quotation_item_service_id;
DROP INDEX IF EXISTS sales.idx_quotation_item_product_id;
DROP TRIGGER IF EXISTS trg_sales_quotation_sync ON sales.quotation;
DROP FUNCTION IF EXISTS sales.sync_quotation_dual_columns();
ALTER TABLE sales.deal DROP CONSTRAINT IF EXISTS fk_deal_pipeline_stage;
DROP INDEX IF EXISTS sales.idx_deal_pipeline_stage_id;
