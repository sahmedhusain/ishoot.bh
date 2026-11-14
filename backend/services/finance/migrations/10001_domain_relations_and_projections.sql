-- +goose Up
-- Canonicalize finance.invoice and keep legacy 09999 columns synchronized
UPDATE finance.invoice
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
CREATE OR REPLACE FUNCTION finance.sync_invoice_dual_columns() RETURNS trigger AS $$
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

DROP TRIGGER IF EXISTS trg_finance_invoice_sync ON finance.invoice;
CREATE TRIGGER trg_finance_invoice_sync
    BEFORE INSERT OR UPDATE ON finance.invoice
    FOR EACH ROW EXECUTE FUNCTION finance.sync_invoice_dual_columns();

-- Upgrade finance.invoice_item to link catalog services & inventory products + bilingual descriptions
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'custom';
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS service_id text;
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS variant_id text;
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '';
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '';
ALTER TABLE finance.invoice_item ADD COLUMN IF NOT EXISTS tax_rate numeric(5, 2) NOT NULL DEFAULT 0;

UPDATE finance.invoice_item SET description_en = description WHERE description_en = '' AND description <> '';

INSERT INTO finance.invoice_item (id, invoice_id, item_kind, service_id, description, description_en, description_ar, quantity, unit_price, amount, sort_order)
SELECT
    li.id,
    li.invoice_id,
    CASE WHEN li.service_id IS NOT NULL THEN 'service' ELSE 'custom' END,
    li.service_id,
    COALESCE(NULLIF(li.description_en, ''), COALESCE(li.description_ar, 'Item')),
    COALESCE(li.description_en, ''),
    COALESCE(li.description_ar, ''),
    COALESCE(li.quantity, 1),
    COALESCE(li.unit_price, 0),
    COALESCE(li.line_total, 0),
    COALESCE(li.display_order, 0)
FROM finance.invoice_line_item li
WHERE li.invoice_id IN (SELECT id FROM finance.invoice)
  AND NOT EXISTS (SELECT 1 FROM finance.invoice_item ii WHERE ii.id = li.id)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_invoice_item_service_id ON finance.invoice_item (service_id);
CREATE INDEX IF NOT EXISTS idx_invoice_item_product_id ON finance.invoice_item (product_id);

-- Connect finance.payment (receipts) and finance.bank_settlement bidirectionally
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_receipt_number ON finance.payment (receipt_number) WHERE receipt_number IS NOT NULL AND receipt_number <> '';
ALTER TABLE finance.payment ADD COLUMN IF NOT EXISTS bank_settlement_id text;
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_bank_settlement' AND conrelid = 'finance.payment'::regclass) THEN
        ALTER TABLE finance.payment ADD CONSTRAINT fk_payment_bank_settlement FOREIGN KEY (bank_settlement_id) REFERENCES finance.bank_settlement(id) ON DELETE SET NULL;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_bank_settlement_id ON finance.payment (bank_settlement_id);

ALTER TABLE finance.bank_settlement ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE finance.bank_settlement ADD COLUMN IF NOT EXISTS settlement_date timestamptz;
ALTER TABLE finance.bank_settlement ADD COLUMN IF NOT EXISTS bank_reference text;
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bank_settlement_payment' AND conrelid = 'finance.bank_settlement'::regclass) THEN
        ALTER TABLE finance.bank_settlement ADD CONSTRAINT fk_bank_settlement_payment FOREIGN KEY (payment_id) REFERENCES finance.payment(id) ON DELETE SET NULL;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_bank_settlement_payment_id ON finance.bank_settlement (payment_id);

-- Cross-service read-model projection tables synchronized via NATS JetStream
CREATE TABLE IF NOT EXISTS finance.contact_ref (
    id text PRIMARY KEY,
    first_name text NOT NULL DEFAULT '',
    last_name text,
    company text,
    email text,
    phone text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance.quotation_ref (
    id text PRIMARY KEY,
    quotation_number text NOT NULL,
    deal_id text,
    contact_id text,
    currency text NOT NULL DEFAULT 'BHD',
    subtotal numeric(14, 3) NOT NULL DEFAULT 0,
    discount numeric(14, 3) NOT NULL DEFAULT 0,
    vat_rate numeric(5, 2) NOT NULL DEFAULT 0,
    vat_amount numeric(14, 3) NOT NULL DEFAULT 0,
    total numeric(14, 3) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'accepted',
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_quotation_ref_contact ON finance.quotation_ref (contact_id);

CREATE TABLE IF NOT EXISTS finance.catalog_item_ref (
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
CREATE INDEX IF NOT EXISTS idx_fin_catalog_item_active ON finance.catalog_item_ref (is_active, kind);

-- +goose Down
DROP TABLE IF EXISTS finance.catalog_item_ref;
DROP TABLE IF EXISTS finance.quotation_ref;
DROP TABLE IF EXISTS finance.contact_ref;
ALTER TABLE finance.bank_settlement DROP CONSTRAINT IF EXISTS fk_bank_settlement_payment;
ALTER TABLE finance.payment DROP CONSTRAINT IF EXISTS fk_payment_bank_settlement;
DROP INDEX IF EXISTS finance.uq_payment_receipt_number;
DROP INDEX IF EXISTS finance.idx_invoice_item_service_id;
DROP INDEX IF EXISTS finance.idx_invoice_item_product_id;
DROP TRIGGER IF EXISTS trg_finance_invoice_sync ON finance.invoice;
DROP FUNCTION IF EXISTS finance.sync_invoice_dual_columns();
