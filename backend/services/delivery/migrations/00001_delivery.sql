-- +goose Up
CREATE TABLE IF NOT EXISTS delivery.delivery_settings (
    id text PRIMARY KEY DEFAULT 'default',
    mode text NOT NULL DEFAULT 'own', -- own | agency | both
    sla_hours integer NOT NULL DEFAULT 48,
    time_zone text,
    slot_days integer NOT NULL DEFAULT 7,
    lead_minutes integer NOT NULL DEFAULT 120,
    require_slot boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery.delivery_zone (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    areas text[] NOT NULL DEFAULT '{}',
    fee numeric(15, 6) NOT NULL DEFAULT 0.000000,
    min_order numeric(15, 6),
    free_over numeric(15, 6),
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery.delivery_slot (
    id text PRIMARY KEY,
    zone_id text REFERENCES delivery.delivery_zone(id) ON DELETE CASCADE,
    weekday integer NOT NULL, -- 0 = Sunday ... 6 = Saturday
    slot_start text NOT NULL,
    slot_end text NOT NULL,
    capacity integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delivery_slot_weekday_idx ON delivery.delivery_slot (weekday);

CREATE TABLE IF NOT EXISTS delivery.vehicle (
    id text PRIMARY KEY,
    plate text NOT NULL UNIQUE,
    name text NOT NULL,
    kind text NOT NULL DEFAULT 'van', -- car | van | motorbike | truck | bicycle | other
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery.route_sheet (
    id text PRIMARY KEY,
    number text NOT NULL UNIQUE,
    driver_id text,
    vehicle_id text REFERENCES delivery.vehicle(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'draft', -- draft | in_progress | completed
    run_date date NOT NULL DEFAULT current_date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery.shipment (
    id text PRIMARY KEY,
    number text NOT NULL UNIQUE,
    order_id text NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- pending | assigned | out_for_delivery | delivered | failed | returned | cancelled
    method text NOT NULL DEFAULT 'own', -- own | agency
    zone_id text REFERENCES delivery.delivery_zone(id) ON DELETE SET NULL,
    slot_id text,
    slot_date date,
    slot_start text,
    slot_end text,
    promised_by timestamptz NOT NULL,
    recipient_name text NOT NULL,
    recipient_phone text NOT NULL,
    address jsonb NOT NULL,
    cod_amount numeric(15, 6) NOT NULL DEFAULT 0.000000,
    cod_collected numeric(15, 6) NOT NULL DEFAULT 0.000000,
    tracking_token text NOT NULL UNIQUE,
    attempts integer NOT NULL DEFAULT 0,
    failure_reason text,
    out_at timestamptz,
    delivered_at timestamptz,
    driver_id text,
    vehicle_id text REFERENCES delivery.vehicle(id) ON DELETE SET NULL,
    route_sheet_id text REFERENCES delivery.route_sheet(id) ON DELETE SET NULL,
    route_stop integer,
    proof_photo_url text,
    proof_signature text,
    agency_id text,
    tracking_number text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_order_idx ON delivery.shipment (order_id);
CREATE INDEX IF NOT EXISTS shipment_status_promised_idx ON delivery.shipment (status, promised_by);
CREATE INDEX IF NOT EXISTS shipment_driver_status_idx ON delivery.shipment (driver_id, status);

CREATE TABLE IF NOT EXISTS delivery.shipment_event (
    id text PRIMARY KEY,
    shipment_id text NOT NULL REFERENCES delivery.shipment(id) ON DELETE CASCADE,
    status text NOT NULL,
    reason text,
    note text,
    by_id text,
    at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_event_shipment_idx ON delivery.shipment_event (shipment_id, at);

CREATE TABLE IF NOT EXISTS delivery.cod_settlement (
    id text PRIMARY KEY,
    sheet_id text REFERENCES delivery.route_sheet(id) ON DELETE SET NULL,
    driver_id text NOT NULL,
    amount_collected numeric(15, 6) NOT NULL DEFAULT 0.000000,
    amount_settled numeric(15, 6) NOT NULL DEFAULT 0.000000,
    status text NOT NULL DEFAULT 'pending', -- pending | settled | disputed
    settled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery.courier_agency (
    id text PRIMARY KEY,
    name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    api_endpoint text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS delivery.courier_agency;
DROP TABLE IF EXISTS delivery.cod_settlement;
DROP TABLE IF EXISTS delivery.shipment_event;
DROP TABLE IF EXISTS delivery.shipment;
DROP TABLE IF EXISTS delivery.route_sheet;
DROP TABLE IF EXISTS delivery.vehicle;
DROP TABLE IF EXISTS delivery.delivery_slot;
DROP TABLE IF EXISTS delivery.delivery_zone;
DROP TABLE IF EXISTS delivery.delivery_settings;