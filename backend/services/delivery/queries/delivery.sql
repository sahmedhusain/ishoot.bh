SELECT * FROM delivery.delivery_settings WHERE id = 'default' LIMIT 1;
INSERT INTO delivery.delivery_settings (
    id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at
) VALUES (
    'default', $1, $2, $3, $4, $5, $6, now()
)
ON CONFLICT (id) DO UPDATE SET
    mode = EXCLUDED.mode,
    sla_hours = EXCLUDED.sla_hours,
    time_zone = EXCLUDED.time_zone,
    slot_days = EXCLUDED.slot_days,
    lead_minutes = EXCLUDED.lead_minutes,
    require_slot = EXCLUDED.require_slot,
    updated_at = now()
RETURNING *;
SELECT * FROM delivery.delivery_zone ORDER BY sort_order ASC, name_en ASC;
SELECT * FROM delivery.delivery_zone WHERE id = $1 LIMIT 1;
INSERT INTO delivery.delivery_zone (
    id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
) RETURNING *;
SELECT * FROM delivery.delivery_slot WHERE zone_id = $1 ORDER BY weekday ASC, slot_start ASC;
INSERT INTO delivery.delivery_slot (
    id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, now()
) RETURNING *;
SELECT * FROM delivery.vehicle ORDER BY name ASC;
SELECT * FROM delivery.vehicle WHERE id = $1 LIMIT 1;
INSERT INTO delivery.vehicle (
    id, plate, name, kind, notes, is_active, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING *;
SELECT * FROM delivery.route_sheet ORDER BY run_date DESC, created_at DESC;
SELECT * FROM delivery.route_sheet WHERE id = $1 LIMIT 1;
INSERT INTO delivery.route_sheet (
    id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING *;
UPDATE delivery.route_sheet SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;
SELECT * FROM delivery.shipment ORDER BY created_at DESC;
SELECT * FROM delivery.shipment WHERE id = $1 LIMIT 1;
SELECT * FROM delivery.shipment WHERE number = $1 LIMIT 1;
SELECT * FROM delivery.shipment WHERE tracking_token = $1 LIMIT 1;
SELECT * FROM delivery.shipment WHERE order_id = $1 ORDER BY created_at ASC;
SELECT * FROM delivery.shipment WHERE driver_id = $1 AND status = $2 ORDER BY route_stop ASC, promised_by ASC;
INSERT INTO delivery.shipment (
    id, number, order_id, status, method, zone_id, slot_id, slot_date,
    slot_start, slot_end, promised_by, recipient_name, recipient_phone,
    address, cod_amount, cod_collected, tracking_token, attempts, failure_reason,
    driver_id, vehicle_id, route_sheet_id, route_stop, agency_id, tracking_number,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13,
    $14, $15, $16, $17, $18, $19,
    $20, $21, $22, $23, $24, $25,
    now(), now()
) RETURNING *;
UPDATE delivery.shipment SET
    status = $2,
    failure_reason = $3,
    out_at = $4,
    delivered_at = $5,
    updated_at = now()
WHERE id = $1
RETURNING *;
UPDATE delivery.shipment SET
    driver_id = $2,
    vehicle_id = $3,
    route_sheet_id = $4,
    route_stop = $5,
    status = 'assigned',
    updated_at = now()
WHERE id = $1
RETURNING *;
UPDATE delivery.shipment SET
    proof_photo_url = $2,
    proof_signature = $3,
    cod_collected = $4,
    status = 'delivered',
    delivered_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING *;
SELECT * FROM delivery.shipment_event WHERE shipment_id = $1 ORDER BY at ASC;
INSERT INTO delivery.shipment_event (
    id, shipment_id, status, reason, note, by_id, at
) VALUES (
    $1, $2, $3, $4, $5, $6, now()
) RETURNING *;
