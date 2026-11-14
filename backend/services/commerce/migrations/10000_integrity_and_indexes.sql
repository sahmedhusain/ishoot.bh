-- +goose Up
CREATE INDEX IF NOT EXISTS idx_customer_crm_contact_id ON commerce.customer (crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_session_customer_id ON commerce.customer_session (customer_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_session_customer_id' AND conrelid = 'commerce.customer_session'::regclass) THEN
        DELETE FROM commerce.customer_session WHERE customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM commerce.customer p WHERE p.id = commerce.customer_session.customer_id);
        ALTER TABLE commerce.customer_session ADD CONSTRAINT fk_customer_session_customer_id FOREIGN KEY (customer_id) REFERENCES commerce.customer(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_delivery_slot_zone_id ON commerce.delivery_slot (zone_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON commerce.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_retail_closing_shift_id ON commerce.retail_closing (shift_id);
CREATE INDEX IF NOT EXISTS idx_retail_closing_branch_id ON commerce.retail_closing (branch_id);
CREATE INDEX IF NOT EXISTS idx_retail_closing_target_id ON commerce.retail_closing (target_id);
CREATE INDEX IF NOT EXISTS idx_retail_closing_closed_by_id ON commerce.retail_closing (closed_by_id);
CREATE INDEX IF NOT EXISTS idx_retail_closing_journal_id ON commerce.retail_closing (journal_id);
CREATE INDEX IF NOT EXISTS idx_retail_register_branch_id ON commerce.retail_register (branch_id);
CREATE INDEX IF NOT EXISTS idx_retail_shift_register_id ON commerce.retail_shift (register_id);
CREATE INDEX IF NOT EXISTS idx_retail_shift_cashier_id ON commerce.retail_shift (cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_contact_id ON commerce.sales_order (contact_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_warehouse_id ON commerce.sales_order (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_invoice_id ON commerce.sales_order (invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_created_by_id ON commerce.sales_order (created_by_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_event_by_id ON commerce.sales_order_event (by_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_line_product_id ON commerce.sales_order_line (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_line_location_id ON commerce.sales_order_line (location_id);
CREATE INDEX IF NOT EXISTS idx_shipment_order_id ON commerce.shipment (order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_zone_id ON commerce.shipment (zone_id);
CREATE INDEX IF NOT EXISTS idx_shipment_slot_id ON commerce.shipment (slot_id);
CREATE INDEX IF NOT EXISTS idx_shipment_driver_id ON commerce.shipment (driver_id);
CREATE INDEX IF NOT EXISTS idx_shipment_vehicle_id ON commerce.shipment (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_shipment_route_sheet_id ON commerce.shipment (route_sheet_id);
CREATE INDEX IF NOT EXISTS idx_shipment_cod_settlement_id ON commerce.shipment (cod_settlement_id);
CREATE INDEX IF NOT EXISTS idx_shipment_agency_id ON commerce.shipment (agency_id);
CREATE INDEX IF NOT EXISTS idx_shipment_courier_booking_agency_id ON commerce.shipment (courier_booking_agency_id);
CREATE INDEX IF NOT EXISTS idx_shipment_agency_invoice_id ON commerce.shipment (agency_invoice_id);
CREATE INDEX IF NOT EXISTS idx_shipment_event_shipment_id ON commerce.shipment_event (shipment_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipment_event_shipment_id' AND conrelid = 'commerce.shipment_event'::regclass) THEN
        DELETE FROM commerce.shipment_event WHERE shipment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM commerce.shipment p WHERE p.id = commerce.shipment_event.shipment_id);
        ALTER TABLE commerce.shipment_event ADD CONSTRAINT fk_shipment_event_shipment_id FOREIGN KEY (shipment_id) REFERENCES commerce.shipment(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_shipment_event_by_id ON commerce.shipment_event (by_id);
CREATE INDEX IF NOT EXISTS idx_store_region_branch_id ON commerce.store_region (branch_id);

-- +goose Down
DROP INDEX IF EXISTS commerce.idx_customer_crm_contact_id;
DROP INDEX IF EXISTS commerce.idx_customer_session_customer_id;
ALTER TABLE commerce.customer_session DROP CONSTRAINT IF EXISTS fk_customer_session_customer_id;
DROP INDEX IF EXISTS commerce.idx_delivery_slot_zone_id;
DROP INDEX IF EXISTS commerce.idx_inbox_event_id;
DROP INDEX IF EXISTS commerce.idx_retail_closing_shift_id;
DROP INDEX IF EXISTS commerce.idx_retail_closing_branch_id;
DROP INDEX IF EXISTS commerce.idx_retail_closing_target_id;
DROP INDEX IF EXISTS commerce.idx_retail_closing_closed_by_id;
DROP INDEX IF EXISTS commerce.idx_retail_closing_journal_id;
DROP INDEX IF EXISTS commerce.idx_retail_register_branch_id;
DROP INDEX IF EXISTS commerce.idx_retail_shift_register_id;
DROP INDEX IF EXISTS commerce.idx_retail_shift_cashier_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_contact_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_warehouse_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_invoice_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_created_by_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_event_by_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_line_product_id;
DROP INDEX IF EXISTS commerce.idx_sales_order_line_location_id;
DROP INDEX IF EXISTS commerce.idx_shipment_order_id;
DROP INDEX IF EXISTS commerce.idx_shipment_zone_id;
DROP INDEX IF EXISTS commerce.idx_shipment_slot_id;
DROP INDEX IF EXISTS commerce.idx_shipment_driver_id;
DROP INDEX IF EXISTS commerce.idx_shipment_vehicle_id;
DROP INDEX IF EXISTS commerce.idx_shipment_route_sheet_id;
DROP INDEX IF EXISTS commerce.idx_shipment_cod_settlement_id;
DROP INDEX IF EXISTS commerce.idx_shipment_agency_id;
DROP INDEX IF EXISTS commerce.idx_shipment_courier_booking_agency_id;
DROP INDEX IF EXISTS commerce.idx_shipment_agency_invoice_id;
DROP INDEX IF EXISTS commerce.idx_shipment_event_shipment_id;
ALTER TABLE commerce.shipment_event DROP CONSTRAINT IF EXISTS fk_shipment_event_shipment_id;
DROP INDEX IF EXISTS commerce.idx_shipment_event_by_id;
DROP INDEX IF EXISTS commerce.idx_store_region_branch_id;
