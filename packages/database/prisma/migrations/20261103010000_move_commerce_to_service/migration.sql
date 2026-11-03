-- Migration: move commerce entities to commerce schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Customer') THEN
        INSERT INTO commerce.customer (
            id, email, phone, first_name, last_name, status, created_at, updated_at
        )
        SELECT
            id, email, phone,
            SPLIT_PART(name, ' ', 1),
            COALESCE(NULLIF(SUBSTRING(name FROM POSITION(' ' IN name) + 1), ''), SPLIT_PART(name, ' ', 1)),
            'active', "createdAt", "updatedAt"
        FROM public."Customer"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CustomerAddress') THEN
        INSERT INTO commerce.customer_address (
            id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default
        )
        SELECT
            id, "customerId", 'shipping', COALESCE(label, 'Default'), line1, COALESCE(line2, ''), city, COALESCE(area, ''), COALESCE("postalCode", ''), country, "isDefault"
        FROM public."CustomerAddress"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StoreSettings') THEN
        INSERT INTO commerce.store_settings (
            id, currency, tax_inclusive, default_tax_rate, minimum_order_amount, free_shipping_threshold
        )
        SELECT
            id, 'BHD', true, 10.00, 0.000, COALESCE("freeDeliveryOver", 0.000)
        FROM public."StoreSettings"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Coupon') THEN
        INSERT INTO commerce.coupon (
            id, code, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, expires_at, usage_limit, usage_count, is_active, created_at
        )
        SELECT
            id, code, kind, value, COALESCE("minOrder", 0.000), NULL, "startsAt", "endsAt", "maxUses", "usedCount", "isActive", "createdAt"
        FROM public."Coupon"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SalesOrder') THEN
        INSERT INTO commerce.sales_order (
            id, number, customer_id, contact_id, email, name, phone, channel, status,
            payment_status, payment_method, fulfilment, shipping_address, subtotal,
            discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid,
            amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id,
            placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at
        )
        SELECT
            id, number, "customerId", "contactId", email, name, phone, channel, status,
            "paymentStatus", "paymentMethod", fulfilment, "shippingAddress"::jsonb, subtotal,
            "discountAmount", "couponCode", "vatAmount", "deliveryFee", total, "amountPaid",
            "amountRefunded", currency, locale, note, "warehouseId", "invoiceId", "createdById",
            "placedAt", "paidAt", "shippedAt", "deliveredAt", "cancelledAt", "utmCampaign", "utmSource", "utmMedium", "updatedAt"
        FROM public."SalesOrder"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SalesOrderLine') THEN
        INSERT INTO commerce.sales_order_line (
            id, order_id, product_id, variant_key, sku, description, quantity, unit_price, vat_exempt, line_total, location_id, returned_quantity, sort_order
        )
        SELECT
            id, "orderId", "productId", "variantKey", sku, description, quantity, "unitPrice", "vatExempt", "lineTotal", "locationId", "returnedQuantity", "sortOrder"
        FROM public."SalesOrderLine"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SalesOrderEvent') THEN
        INSERT INTO commerce.sales_order_event (
            id, order_id, kind, status, note, amount, by_id, created_at
        )
        SELECT
            id, "orderId", kind, status, note, amount, "byId", "createdAt"
        FROM public."SalesOrderEvent"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RetailRegister') THEN
        INSERT INTO commerce.retail_register (
            id, name, branch_id, is_active
        )
        SELECT
            id, name, "branchId", "isActive"
        FROM public."RetailRegister"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashierSession') THEN
        INSERT INTO commerce.retail_shift (
            id, register_id, cashier_id, opened_at, starting_cash, closing_cash, expected_cash, status
        )
        SELECT
            id, "registerId", "cashierId", "openedAt", "openingFloat", COALESCE("closingFloat", 0), "expectedCash", status
        FROM public."CashierSession"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
