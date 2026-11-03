-- Migration: move delivery entities to delivery schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliverySettings') THEN
        INSERT INTO delivery.delivery_settings (
            id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at
        )
        SELECT
            id, mode, "slaHours", "timeZone", "slotDays", "leadMinutes", "requireSlot", "updatedAt"
        FROM public."DeliverySettings"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliveryZone') THEN
        INSERT INTO delivery.delivery_zone (
            id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at
        )
        SELECT
            id, "nameEn", "nameAr", areas, fee, "minOrder", "freeOver", "isActive", "sortOrder", "createdAt", "updatedAt"
        FROM public."DeliveryZone"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DeliverySlot') THEN
        INSERT INTO delivery.delivery_slot (
            id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at
        )
        SELECT
            id, "zoneId", weekday, start, "end", capacity, "isActive", "createdAt"
        FROM public."DeliverySlot"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Vehicle') THEN
        INSERT INTO delivery.vehicle (
            id, plate, name, kind, notes, is_active, created_at, updated_at
        )
        SELECT
            id, plate, name, kind, notes, "isActive", "createdAt", "updatedAt"
        FROM public."Vehicle"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RouteSheet') THEN
        INSERT INTO delivery.route_sheet (
            id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at
        )
        SELECT
            id, number, "driverId", "vehicleId", status, date, "createdAt", "updatedAt"
        FROM public."RouteSheet"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Shipment') THEN
        INSERT INTO delivery.shipment (
            id, number, order_id, status, method, zone_id, slot_id, slot_date,
            slot_start, slot_end, promised_by, recipient_name, recipient_phone,
            address, cod_amount, cod_collected, tracking_token, attempts, failure_reason,
            driver_id, vehicle_id, route_sheet_id, route_stop, agency_id, tracking_number,
            created_at, updated_at
        )
        SELECT
            id, number, "orderId", status, method, "zoneId", "slotId", "slotDate",
            "slotStart", "slotEnd", "promisedBy", "recipientName", "recipientPhone",
            address::jsonb, "codAmount", "codCollected", "trackingToken", attempts, "failureReason",
            "driverId", "vehicleId", "routeSheetId", "routeStop", "agencyId", "trackingNumber",
            "createdAt", "updatedAt"
        FROM public."Shipment"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ShipmentEvent') THEN
        INSERT INTO delivery.shipment_event (
            id, shipment_id, status, reason, note, by_id, at
        )
        SELECT
            id, "shipmentId", status, reason, note, "byId", at
        FROM public."ShipmentEvent"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CodSettlement') THEN
        INSERT INTO delivery.cod_settlement (
            id, sheet_id, driver_id, amount_collected, amount_settled, status, settled_at, created_at
        )
        SELECT
            cs.id, NULL, COALESCE(cs."driverId", (SELECT id FROM hr.employee LIMIT 1), 'emp-default'),
            cs.expected, cs.received, 'settled', cs."settledAt", cs."settledAt"
        FROM public."CodSettlement" cs
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CourierAgency') THEN
        INSERT INTO delivery.courier_agency (
            id, name, contact_name, email, phone, api_endpoint, is_active, created_at
        )
        SELECT
            id, name, NULL, email, phone, "trackingUrl", "isActive", "createdAt"
        FROM public."CourierAgency"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
