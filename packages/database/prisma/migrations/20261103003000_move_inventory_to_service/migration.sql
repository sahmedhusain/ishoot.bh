-- Migration: move inventory entities to inventory schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Warehouse') THEN
        INSERT INTO inventory.warehouse (
            id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at
        )
        SELECT
            id, code, "nameEn", "nameAr", address, "isActive", "isDefault", "branchId", "sortOrder", "createdAt", "updatedAt"
        FROM public."Warehouse"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockLocation') THEN
        INSERT INTO inventory.stock_location (
            id, warehouse_id, code, name, is_active, created_at
        )
        SELECT
            id, "warehouseId", code, COALESCE(name, ''), "isActive", "createdAt"
        FROM public."StockLocation"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProductCategory') THEN
        INSERT INTO inventory.product_category (
            id, slug, name_en, name_ar, description_en, description_ar, parent_id, sort_order, is_active
        )
        SELECT
            id,
            LOWER(REGEXP_REPLACE("nameEn", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id FROM 1 FOR 8),
            "nameEn", "nameAr", '', '', "parentId", "sortOrder", "isActive"
        FROM public."ProductCategory"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Product') THEN
        INSERT INTO inventory.product (
            id, sku, name_en, name_ar, description_en, description_ar, category_id,
            cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point,
            created_at, updated_at
        )
        SELECT
            id, sku, "nameEn", "nameAr", COALESCE("descriptionEn", ''), COALESCE("descriptionAr", ''), "categoryId",
            cost, price, 'BHD', CASE WHEN "vatExempt" THEN 0.00 ELSE 10.00 END, barcode, "isActive", "trackStock", 0.00,
            "createdAt", "updatedAt"
        FROM public."Product"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProductVariant') THEN
        INSERT INTO inventory.product_variant (
            id, product_id, sku, name_en, name_ar, barcode, cost_price, selling_price, is_active, attributes
        )
        SELECT
            id, "productId", sku, sku, sku, barcode, COALESCE(cost, 0.0000), COALESCE(price, 0.0000), "isActive", to_jsonb("optionValues")
        FROM public."ProductVariant"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockLevel') THEN
        INSERT INTO inventory.stock_level (
            id, product_id, variant_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at
        )
        SELECT
            id, "productId", CASE WHEN "variantKey" = '' THEN NULL ELSE "variantKey" END, "locationId", "onHand", "reserved", ("onHand" - "reserved"), 0.00, "updatedAt"
        FROM public."StockLevel"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockBatch') THEN
        INSERT INTO inventory.stock_batch (
            id, batch_number, product_id, variant_id, location_id, initial_quantity, remaining_quantity, cost_per_unit, expiry_date, received_at
        )
        SELECT
            sb.id, sb."batchNumber", sb."productId", CASE WHEN sb."variantKey" = '' THEN NULL ELSE sb."variantKey" END,
            COALESCE((SELECT sl.id FROM inventory.stock_location sl LIMIT 1), 'loc-default'),
            0.00, 0.00, 0.00, sb."expiryDate", sb."createdAt"
        FROM public."StockBatch" sb
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockMovement') THEN
        INSERT INTO inventory.stock_movement (
            id, movement_type, product_id, variant_id, location_id, quantity, unit_cost, source_type, source_id, transfer_id, reason, note, created_by_id, created_at
        )
        SELECT
            id, type, "productId", CASE WHEN "variantKey" = '' THEN NULL ELSE "variantKey" END, "locationId", quantity, "unitCost", "sourceType", "sourceId", "transferId", reason, note, "createdById", "createdAt"
        FROM public."StockMovement"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockCount') THEN
        INSERT INTO inventory.stock_count (
            id, count_number, warehouse_id, status, notes, counted_by_id, approved_by_id, counted_at, approved_at, created_at
        )
        SELECT
            id, number, "warehouseId", status, note, "createdById", "approvedById", "createdAt", "approvedAt", "createdAt"
        FROM public."StockCount"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockCountLine') THEN
        INSERT INTO inventory.stock_count_line (
            id, count_id, product_id, variant_id, system_quantity, counted_quantity, variance, notes
        )
        SELECT
            id, "countId", "productId", CASE WHEN "variantKey" = '' THEN NULL ELSE "variantKey" END, expected, COALESCE(counted, expected), (COALESCE(counted, expected) - expected), note
        FROM public."StockCountLine"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
