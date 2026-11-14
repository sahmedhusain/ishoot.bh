-- +goose Up
CREATE INDEX IF NOT EXISTS idx_campaign_owner_id ON sales.campaign (owner_id);
CREATE INDEX IF NOT EXISTS idx_campaign_created_by_id ON sales.campaign (created_by_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_contact_id ON sales.crm_deal (contact_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crm_deal_contact_id' AND conrelid = 'sales.crm_deal'::regclass) THEN
        UPDATE sales.crm_deal SET contact_id = NULL WHERE contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sales.contact p WHERE p.id = sales.crm_deal.contact_id);
        ALTER TABLE sales.crm_deal ADD CONSTRAINT fk_crm_deal_contact_id FOREIGN KEY (contact_id) REFERENCES sales.contact(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_crm_deal_source_inquiry_id ON sales.crm_deal (source_inquiry_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_assigned_to ON sales.crm_deal (assigned_to);
CREATE INDEX IF NOT EXISTS idx_deal_contact_id ON sales.deal (contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_assigned_to ON sales.deal (assigned_to);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON sales.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_assignee_id ON sales.inquiry (assignee_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_deal_id ON sales.inquiry (deal_id);
CREATE INDEX IF NOT EXISTS idx_quotation_deal_id ON sales.quotation (deal_id);
CREATE INDEX IF NOT EXISTS idx_quotation_contact_id ON sales.quotation (contact_id);
CREATE INDEX IF NOT EXISTS idx_quotation_client_id ON sales.quotation (client_id);
CREATE INDEX IF NOT EXISTS idx_quotation_inquiry_id ON sales.quotation (inquiry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quotation_inquiry_id' AND conrelid = 'sales.quotation'::regclass) THEN
        UPDATE sales.quotation SET inquiry_id = NULL WHERE inquiry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sales.inquiry p WHERE p.id = sales.quotation.inquiry_id);
        ALTER TABLE sales.quotation ADD CONSTRAINT fk_quotation_inquiry_id FOREIGN KEY (inquiry_id) REFERENCES sales.inquiry(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_quotation_invoice_id ON sales.quotation (invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotation_created_by_id ON sales.quotation (created_by_id);
CREATE INDEX IF NOT EXISTS idx_quotation_sales_owner_id ON sales.quotation (sales_owner_id);
CREATE INDEX IF NOT EXISTS idx_quotation_signed_by_id ON sales.quotation (signed_by_id);
CREATE INDEX IF NOT EXISTS idx_quotation_line_item_quotation_id ON sales.quotation_line_item (quotation_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quotation_line_item_quotation_id' AND conrelid = 'sales.quotation_line_item'::regclass) THEN
        DELETE FROM sales.quotation_line_item WHERE quotation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sales.quotation p WHERE p.id = sales.quotation_line_item.quotation_id);
        ALTER TABLE sales.quotation_line_item ADD CONSTRAINT fk_quotation_line_item_quotation_id FOREIGN KEY (quotation_id) REFERENCES sales.quotation(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_sales_attribution_change_entity_id ON sales.sales_attribution_change (entity_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_change_from_user_id ON sales.sales_attribution_change (from_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_change_to_user_id ON sales.sales_attribution_change (to_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_change_changed_by_id ON sales.sales_attribution_change (changed_by_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_customer_id ON sales.sales_order (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_contact_id ON sales.sales_order (contact_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_order_contact_id' AND conrelid = 'sales.sales_order'::regclass) THEN
        UPDATE sales.sales_order SET contact_id = NULL WHERE contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sales.contact p WHERE p.id = sales.sales_order.contact_id);
        ALTER TABLE sales.sales_order ADD CONSTRAINT fk_sales_order_contact_id FOREIGN KEY (contact_id) REFERENCES sales.contact(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_sales_order_warehouse_id ON sales.sales_order (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_invoice_id ON sales.sales_order (invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_created_by_id ON sales.sales_order (created_by_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_event_order_id ON sales.sales_order_event (order_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_order_event_order_id' AND conrelid = 'sales.sales_order_event'::regclass) THEN
        DELETE FROM sales.sales_order_event WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sales.sales_order p WHERE p.id = sales.sales_order_event.order_id);
        ALTER TABLE sales.sales_order_event ADD CONSTRAINT fk_sales_order_event_order_id FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_sales_order_event_by_id ON sales.sales_order_event (by_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_line_order_id ON sales.sales_order_line (order_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_order_line_order_id' AND conrelid = 'sales.sales_order_line'::regclass) THEN
        DELETE FROM sales.sales_order_line WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sales.sales_order p WHERE p.id = sales.sales_order_line.order_id);
        ALTER TABLE sales.sales_order_line ADD CONSTRAINT fk_sales_order_line_order_id FOREIGN KEY (order_id) REFERENCES sales.sales_order(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_sales_order_line_product_id ON sales.sales_order_line (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_line_location_id ON sales.sales_order_line (location_id);
CREATE INDEX IF NOT EXISTS idx_quotation_status_valid ON sales.quotation (status, valid_until);
CREATE INDEX IF NOT EXISTS idx_quotation_deal_created ON sales.quotation (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_status_stage ON sales.deal (status, stage);

-- +goose Down
DROP INDEX IF EXISTS sales.idx_campaign_owner_id;
DROP INDEX IF EXISTS sales.idx_campaign_created_by_id;
DROP INDEX IF EXISTS sales.idx_crm_deal_contact_id;
ALTER TABLE sales.crm_deal DROP CONSTRAINT IF EXISTS fk_crm_deal_contact_id;
DROP INDEX IF EXISTS sales.idx_crm_deal_source_inquiry_id;
DROP INDEX IF EXISTS sales.idx_crm_deal_assigned_to;
DROP INDEX IF EXISTS sales.idx_deal_contact_id;
DROP INDEX IF EXISTS sales.idx_deal_assigned_to;
DROP INDEX IF EXISTS sales.idx_inbox_event_id;
DROP INDEX IF EXISTS sales.idx_inquiry_assignee_id;
DROP INDEX IF EXISTS sales.idx_inquiry_deal_id;
DROP INDEX IF EXISTS sales.idx_quotation_deal_id;
DROP INDEX IF EXISTS sales.idx_quotation_contact_id;
DROP INDEX IF EXISTS sales.idx_quotation_client_id;
DROP INDEX IF EXISTS sales.idx_quotation_inquiry_id;
ALTER TABLE sales.quotation DROP CONSTRAINT IF EXISTS fk_quotation_inquiry_id;
DROP INDEX IF EXISTS sales.idx_quotation_invoice_id;
DROP INDEX IF EXISTS sales.idx_quotation_created_by_id;
DROP INDEX IF EXISTS sales.idx_quotation_sales_owner_id;
DROP INDEX IF EXISTS sales.idx_quotation_signed_by_id;
DROP INDEX IF EXISTS sales.idx_quotation_line_item_quotation_id;
ALTER TABLE sales.quotation_line_item DROP CONSTRAINT IF EXISTS fk_quotation_line_item_quotation_id;
DROP INDEX IF EXISTS sales.idx_sales_attribution_change_entity_id;
DROP INDEX IF EXISTS sales.idx_sales_attribution_change_from_user_id;
DROP INDEX IF EXISTS sales.idx_sales_attribution_change_to_user_id;
DROP INDEX IF EXISTS sales.idx_sales_attribution_change_changed_by_id;
DROP INDEX IF EXISTS sales.idx_sales_order_customer_id;
DROP INDEX IF EXISTS sales.idx_sales_order_contact_id;
ALTER TABLE sales.sales_order DROP CONSTRAINT IF EXISTS fk_sales_order_contact_id;
DROP INDEX IF EXISTS sales.idx_sales_order_warehouse_id;
DROP INDEX IF EXISTS sales.idx_sales_order_invoice_id;
DROP INDEX IF EXISTS sales.idx_sales_order_created_by_id;
DROP INDEX IF EXISTS sales.idx_sales_order_event_order_id;
ALTER TABLE sales.sales_order_event DROP CONSTRAINT IF EXISTS fk_sales_order_event_order_id;
DROP INDEX IF EXISTS sales.idx_sales_order_event_by_id;
DROP INDEX IF EXISTS sales.idx_sales_order_line_order_id;
ALTER TABLE sales.sales_order_line DROP CONSTRAINT IF EXISTS fk_sales_order_line_order_id;
DROP INDEX IF EXISTS sales.idx_sales_order_line_product_id;
DROP INDEX IF EXISTS sales.idx_sales_order_line_location_id;
DROP INDEX IF EXISTS sales.idx_quotation_status_valid;
DROP INDEX IF EXISTS sales.idx_quotation_deal_created;
DROP INDEX IF EXISTS sales.idx_deal_status_stage;
