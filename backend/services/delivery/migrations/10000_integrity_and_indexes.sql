-- +goose Up
CREATE INDEX IF NOT EXISTS idx_cod_settlement_sheet_id ON delivery.cod_settlement (sheet_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlement_driver_id ON delivery.cod_settlement (driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_slot_zone_id ON delivery.delivery_slot (zone_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON delivery.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_route_sheet_driver_id ON delivery.route_sheet (driver_id);
CREATE INDEX IF NOT EXISTS idx_route_sheet_vehicle_id ON delivery.route_sheet (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_shipment_zone_id ON delivery.shipment (zone_id);
CREATE INDEX IF NOT EXISTS idx_shipment_slot_id ON delivery.shipment (slot_id);
CREATE INDEX IF NOT EXISTS idx_shipment_vehicle_id ON delivery.shipment (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_shipment_route_sheet_id ON delivery.shipment (route_sheet_id);
CREATE INDEX IF NOT EXISTS idx_shipment_agency_id ON delivery.shipment (agency_id);
CREATE INDEX IF NOT EXISTS idx_shipment_event_by_id ON delivery.shipment_event (by_id);

-- +goose Down
DROP INDEX IF EXISTS delivery.idx_cod_settlement_sheet_id;
DROP INDEX IF EXISTS delivery.idx_cod_settlement_driver_id;
DROP INDEX IF EXISTS delivery.idx_delivery_slot_zone_id;
DROP INDEX IF EXISTS delivery.idx_inbox_event_id;
DROP INDEX IF EXISTS delivery.idx_route_sheet_driver_id;
DROP INDEX IF EXISTS delivery.idx_route_sheet_vehicle_id;
DROP INDEX IF EXISTS delivery.idx_shipment_zone_id;
DROP INDEX IF EXISTS delivery.idx_shipment_slot_id;
DROP INDEX IF EXISTS delivery.idx_shipment_vehicle_id;
DROP INDEX IF EXISTS delivery.idx_shipment_route_sheet_id;
DROP INDEX IF EXISTS delivery.idx_shipment_agency_id;
DROP INDEX IF EXISTS delivery.idx_shipment_event_by_id;
