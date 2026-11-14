-- +goose Up
CREATE INDEX IF NOT EXISTS idx_goods_receipt_purchase_order_id ON inventory.goods_receipt (purchase_order_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_goods_receipt_purchase_order_id' AND conrelid = 'inventory.goods_receipt'::regclass) THEN
        DELETE FROM inventory.goods_receipt WHERE purchase_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.purchase_order p WHERE p.id = inventory.goods_receipt.purchase_order_id);
        ALTER TABLE inventory.goods_receipt ADD CONSTRAINT fk_goods_receipt_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES inventory.purchase_order(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_goods_receipt_location_id ON inventory.goods_receipt (location_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_received_by_id ON inventory.goods_receipt (received_by_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_line_receipt_id ON inventory.goods_receipt_line (receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_line_order_line_id ON inventory.goods_receipt_line (order_line_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON inventory.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_product_category_parent_id ON inventory.product_category (parent_id);
CREATE INDEX IF NOT EXISTS idx_product_packaging_unit_product_id ON inventory.product_packaging_unit (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_packaging_unit_product_id' AND conrelid = 'inventory.product_packaging_unit'::regclass) THEN
        UPDATE inventory.product_packaging_unit SET product_id = NULL WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.product_packaging_unit.product_id);
        ALTER TABLE inventory.product_packaging_unit ADD CONSTRAINT fk_product_packaging_unit_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier_id ON inventory.purchase_order (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_warehouse_id ON inventory.purchase_order (warehouse_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_order_warehouse_id' AND conrelid = 'inventory.purchase_order'::regclass) THEN
        UPDATE inventory.purchase_order SET warehouse_id = NULL WHERE warehouse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.warehouse p WHERE p.id = inventory.purchase_order.warehouse_id);
        ALTER TABLE inventory.purchase_order ADD CONSTRAINT fk_purchase_order_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES inventory.warehouse(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_purchase_order_requisition_id ON inventory.purchase_order (requisition_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_rfq_id ON inventory.purchase_order (rfq_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_order_rfq_id' AND conrelid = 'inventory.purchase_order'::regclass) THEN
        UPDATE inventory.purchase_order SET rfq_id = NULL WHERE rfq_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.rfq p WHERE p.id = inventory.purchase_order.rfq_id);
        ALTER TABLE inventory.purchase_order ADD CONSTRAINT fk_purchase_order_rfq_id FOREIGN KEY (rfq_id) REFERENCES inventory.rfq(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_purchase_order_created_by_id ON inventory.purchase_order (created_by_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_approved_by_id ON inventory.purchase_order (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_purchase_order_id ON inventory.purchase_order_line (purchase_order_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_order_line_purchase_order_id' AND conrelid = 'inventory.purchase_order_line'::regclass) THEN
        DELETE FROM inventory.purchase_order_line WHERE purchase_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.purchase_order p WHERE p.id = inventory.purchase_order_line.purchase_order_id);
        ALTER TABLE inventory.purchase_order_line ADD CONSTRAINT fk_purchase_order_line_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES inventory.purchase_order(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_product_id ON inventory.purchase_order_line (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_order_line_product_id' AND conrelid = 'inventory.purchase_order_line'::regclass) THEN
        DELETE FROM inventory.purchase_order_line WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.purchase_order_line.product_id);
        ALTER TABLE inventory.purchase_order_line ADD CONSTRAINT fk_purchase_order_line_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_requested_by_id ON inventory.purchase_requisition (requested_by_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_department_id ON inventory.purchase_requisition (department_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_line_requisition_id ON inventory.purchase_requisition_line (requisition_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_line_product_id ON inventory.purchase_requisition_line (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_requisition_line_product_id' AND conrelid = 'inventory.purchase_requisition_line'::regclass) THEN
        DELETE FROM inventory.purchase_requisition_line WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.purchase_requisition_line.product_id);
        ALTER TABLE inventory.purchase_requisition_line ADD CONSTRAINT fk_purchase_requisition_line_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_rfq_requisition_id ON inventory.rfq (requisition_id);
CREATE INDEX IF NOT EXISTS idx_rfq_created_by_id ON inventory.rfq (created_by_id);
CREATE INDEX IF NOT EXISTS idx_rfq_line_rfq_id ON inventory.rfq_line (rfq_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfq_line_rfq_id' AND conrelid = 'inventory.rfq_line'::regclass) THEN
        DELETE FROM inventory.rfq_line WHERE rfq_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.rfq p WHERE p.id = inventory.rfq_line.rfq_id);
        ALTER TABLE inventory.rfq_line ADD CONSTRAINT fk_rfq_line_rfq_id FOREIGN KEY (rfq_id) REFERENCES inventory.rfq(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_rfq_line_product_id ON inventory.rfq_line (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfq_line_product_id' AND conrelid = 'inventory.rfq_line'::regclass) THEN
        DELETE FROM inventory.rfq_line WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.rfq_line.product_id);
        ALTER TABLE inventory.rfq_line ADD CONSTRAINT fk_rfq_line_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_rfq_quote_rfq_id ON inventory.rfq_quote (rfq_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rfq_quote_rfq_id' AND conrelid = 'inventory.rfq_quote'::regclass) THEN
        UPDATE inventory.rfq_quote SET rfq_id = NULL WHERE rfq_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.rfq p WHERE p.id = inventory.rfq_quote.rfq_id);
        ALTER TABLE inventory.rfq_quote ADD CONSTRAINT fk_rfq_quote_rfq_id FOREIGN KEY (rfq_id) REFERENCES inventory.rfq(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_rfq_quote_line_id ON inventory.rfq_quote (line_id);
CREATE INDEX IF NOT EXISTS idx_rfq_quote_supplier_id ON inventory.rfq_quote (supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_acknowledgment_allocation_id ON inventory.stock_acknowledgment (allocation_id);
CREATE INDEX IF NOT EXISTS idx_stock_acknowledgment_actor_id ON inventory.stock_acknowledgment (actor_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_source_location_id ON inventory.stock_allocation (source_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_transit_location_id ON inventory.stock_allocation (transit_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_destination_location_id ON inventory.stock_allocation (destination_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_created_by_id ON inventory.stock_allocation (created_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_approved_by_id ON inventory.stock_allocation (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_carrier_id ON inventory.stock_allocation (carrier_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_line_allocation_id ON inventory.stock_allocation_line (allocation_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_line_product_id ON inventory.stock_allocation_line (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_allocation_line_product_id' AND conrelid = 'inventory.stock_allocation_line'::regclass) THEN
        DELETE FROM inventory.stock_allocation_line WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.stock_allocation_line.product_id);
        ALTER TABLE inventory.stock_allocation_line ADD CONSTRAINT fk_stock_allocation_line_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_stock_batch_variant_id ON inventory.stock_batch (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_batch_location_id ON inventory.stock_batch (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_warehouse_id ON inventory.stock_count (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_counted_by_id ON inventory.stock_count (counted_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_approved_by_id ON inventory.stock_count (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_created_by_id ON inventory.stock_count (created_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_line_product_id ON inventory.stock_count_line (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_line_variant_id ON inventory.stock_count_line (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_line_location_id ON inventory.stock_count_line (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_product_id ON inventory.stock_item (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_item_product_id' AND conrelid = 'inventory.stock_item'::regclass) THEN
        DELETE FROM inventory.stock_item WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.stock_item.product_id);
        ALTER TABLE inventory.stock_item ADD CONSTRAINT fk_stock_item_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_stock_level_variant_id ON inventory.stock_level (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_level_location_id ON inventory.stock_level (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_location_warehouse_id ON inventory.stock_location (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_variant_id ON inventory.stock_movement (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_source_id ON inventory.stock_movement (source_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_transfer_id ON inventory.stock_movement (transfer_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_by_id ON inventory.stock_movement (created_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_package_location_id ON inventory.stock_package (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_package_parent_id ON inventory.stock_package (parent_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_package_parent_id' AND conrelid = 'inventory.stock_package'::regclass) THEN
        UPDATE inventory.stock_package SET parent_id = NULL WHERE parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.stock_package p WHERE p.id = inventory.stock_package.parent_id);
        ALTER TABLE inventory.stock_package ADD CONSTRAINT fk_stock_package_parent_id FOREIGN KEY (parent_id) REFERENCES inventory.stock_package(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_stock_package_created_by_id ON inventory.stock_package (created_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_serial_product_id ON inventory.stock_serial (product_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_serial_product_id' AND conrelid = 'inventory.stock_serial'::regclass) THEN
        UPDATE inventory.stock_serial SET product_id = NULL WHERE product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory.product p WHERE p.id = inventory.stock_serial.product_id);
        ALTER TABLE inventory.stock_serial ADD CONSTRAINT fk_stock_serial_product_id FOREIGN KEY (product_id) REFERENCES inventory.product(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_stock_serial_location_id ON inventory.stock_serial (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_serial_package_id ON inventory.stock_serial (package_id);
CREATE INDEX IF NOT EXISTS idx_stock_serial_generation_id ON inventory.stock_serial (generation_id);
CREATE INDEX IF NOT EXISTS idx_stock_trace_event_entity_id ON inventory.stock_trace_event (entity_id);
CREATE INDEX IF NOT EXISTS idx_stock_trace_event_actor_id ON inventory.stock_trace_event (actor_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_branch_id ON inventory.warehouse (branch_id);

-- +goose Down
DROP INDEX IF EXISTS inventory.idx_goods_receipt_purchase_order_id;
ALTER TABLE inventory.goods_receipt DROP CONSTRAINT IF EXISTS fk_goods_receipt_purchase_order_id;
DROP INDEX IF EXISTS inventory.idx_goods_receipt_location_id;
DROP INDEX IF EXISTS inventory.idx_goods_receipt_received_by_id;
DROP INDEX IF EXISTS inventory.idx_goods_receipt_line_receipt_id;
DROP INDEX IF EXISTS inventory.idx_goods_receipt_line_order_line_id;
DROP INDEX IF EXISTS inventory.idx_inbox_event_id;
DROP INDEX IF EXISTS inventory.idx_product_category_parent_id;
DROP INDEX IF EXISTS inventory.idx_product_packaging_unit_product_id;
ALTER TABLE inventory.product_packaging_unit DROP CONSTRAINT IF EXISTS fk_product_packaging_unit_product_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_supplier_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_warehouse_id;
ALTER TABLE inventory.purchase_order DROP CONSTRAINT IF EXISTS fk_purchase_order_warehouse_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_requisition_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_rfq_id;
ALTER TABLE inventory.purchase_order DROP CONSTRAINT IF EXISTS fk_purchase_order_rfq_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_created_by_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_approved_by_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_line_purchase_order_id;
ALTER TABLE inventory.purchase_order_line DROP CONSTRAINT IF EXISTS fk_purchase_order_line_purchase_order_id;
DROP INDEX IF EXISTS inventory.idx_purchase_order_line_product_id;
ALTER TABLE inventory.purchase_order_line DROP CONSTRAINT IF EXISTS fk_purchase_order_line_product_id;
DROP INDEX IF EXISTS inventory.idx_purchase_requisition_requested_by_id;
DROP INDEX IF EXISTS inventory.idx_purchase_requisition_department_id;
DROP INDEX IF EXISTS inventory.idx_purchase_requisition_line_requisition_id;
DROP INDEX IF EXISTS inventory.idx_purchase_requisition_line_product_id;
ALTER TABLE inventory.purchase_requisition_line DROP CONSTRAINT IF EXISTS fk_purchase_requisition_line_product_id;
DROP INDEX IF EXISTS inventory.idx_rfq_requisition_id;
DROP INDEX IF EXISTS inventory.idx_rfq_created_by_id;
DROP INDEX IF EXISTS inventory.idx_rfq_line_rfq_id;
ALTER TABLE inventory.rfq_line DROP CONSTRAINT IF EXISTS fk_rfq_line_rfq_id;
DROP INDEX IF EXISTS inventory.idx_rfq_line_product_id;
ALTER TABLE inventory.rfq_line DROP CONSTRAINT IF EXISTS fk_rfq_line_product_id;
DROP INDEX IF EXISTS inventory.idx_rfq_quote_rfq_id;
ALTER TABLE inventory.rfq_quote DROP CONSTRAINT IF EXISTS fk_rfq_quote_rfq_id;
DROP INDEX IF EXISTS inventory.idx_rfq_quote_line_id;
DROP INDEX IF EXISTS inventory.idx_rfq_quote_supplier_id;
DROP INDEX IF EXISTS inventory.idx_stock_acknowledgment_allocation_id;
DROP INDEX IF EXISTS inventory.idx_stock_acknowledgment_actor_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_source_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_transit_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_destination_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_created_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_approved_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_carrier_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_line_allocation_id;
DROP INDEX IF EXISTS inventory.idx_stock_allocation_line_product_id;
ALTER TABLE inventory.stock_allocation_line DROP CONSTRAINT IF EXISTS fk_stock_allocation_line_product_id;
DROP INDEX IF EXISTS inventory.idx_stock_batch_variant_id;
DROP INDEX IF EXISTS inventory.idx_stock_batch_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_warehouse_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_counted_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_approved_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_created_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_line_product_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_line_variant_id;
DROP INDEX IF EXISTS inventory.idx_stock_count_line_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_item_product_id;
ALTER TABLE inventory.stock_item DROP CONSTRAINT IF EXISTS fk_stock_item_product_id;
DROP INDEX IF EXISTS inventory.idx_stock_level_variant_id;
DROP INDEX IF EXISTS inventory.idx_stock_level_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_location_warehouse_id;
DROP INDEX IF EXISTS inventory.idx_stock_movement_variant_id;
DROP INDEX IF EXISTS inventory.idx_stock_movement_source_id;
DROP INDEX IF EXISTS inventory.idx_stock_movement_transfer_id;
DROP INDEX IF EXISTS inventory.idx_stock_movement_created_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_package_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_package_parent_id;
ALTER TABLE inventory.stock_package DROP CONSTRAINT IF EXISTS fk_stock_package_parent_id;
DROP INDEX IF EXISTS inventory.idx_stock_package_created_by_id;
DROP INDEX IF EXISTS inventory.idx_stock_serial_product_id;
ALTER TABLE inventory.stock_serial DROP CONSTRAINT IF EXISTS fk_stock_serial_product_id;
DROP INDEX IF EXISTS inventory.idx_stock_serial_location_id;
DROP INDEX IF EXISTS inventory.idx_stock_serial_package_id;
DROP INDEX IF EXISTS inventory.idx_stock_serial_generation_id;
DROP INDEX IF EXISTS inventory.idx_stock_trace_event_entity_id;
DROP INDEX IF EXISTS inventory.idx_stock_trace_event_actor_id;
DROP INDEX IF EXISTS inventory.idx_warehouse_branch_id;
