-- +goose Up
CREATE TABLE IF NOT EXISTS delivery.order_ref (
    order_id text PRIMARY KEY,
    order_number text NOT NULL DEFAULT '',
    customer_id text,
    contact_id text,
    recipient_name text NOT NULL DEFAULT '',
    recipient_phone text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'placed',
    total numeric(15, 6) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_order_ref_customer ON delivery.order_ref (customer_id);

CREATE TABLE IF NOT EXISTS delivery.driver_ref (
    employee_id text PRIMARY KEY,
    user_id text,
    name_en text NOT NULL DEFAULT '',
    name_ar text NOT NULL DEFAULT '',
    phone text,
    department_id text,
    status text NOT NULL DEFAULT 'active',
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_shipment_zone_driver ON delivery.shipment (zone_id, driver_id);

-- +goose Down
DROP INDEX IF EXISTS delivery.idx_delivery_shipment_zone_driver;
DROP TABLE IF EXISTS delivery.driver_ref;
DROP TABLE IF EXISTS delivery.order_ref;
