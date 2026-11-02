# delivery service

Logistics, shipping, and fulfillment: delivery zones, delivery slots, fleet management, route sheets, courier agency bookings, and cash on delivery (COD).
Owns the `delivery` schema: `delivery_setting`, `zone`, `slot`, `vehicle`, `route_sheet`, `shipment`, `shipment_event`, `cod_settlement`, `courier_agency`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Zones & Slot Scheduling**: Geographical delivery zones, rates, capacity limits, and time slots.
- **Fleet Management**: Delivery vehicles, drivers, route sheets, and dispatch manifests.
- **Shipment Lifecycle**: Label generation, pickup, transit milestones, proof of delivery, and failure handling.
- **Courier Integration**: External courier APIs (Aramex, DHL, SMSA) and booking reconciliation.
- **Cash on Delivery (COD)**: Driver collections, reconciliation, and settlement accounting.
- **Outbox Events**: Emits `delivery.shipment.dispatched.v1`, `delivery.shipment.delivered.v1`, `delivery.shipment.failed.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/delivery/settings` | Admin & Web | `delivery:read` / public checkout |
| `GET /v1/delivery/zones` | Admin & Web | `delivery:read` / public checkout |
| `GET /v1/delivery/slots` | Admin & Web | `delivery:read` / public checkout |
| `GET /v1/delivery/shipments` | Admin & Web | `delivery:read` / tracking |
| `POST /v1/delivery/shipments` | Admin & Web | `delivery:edit` / order fulfillment |
| `GET /v1/delivery/fleet/vehicles`| Admin app | `delivery:read` |
| `GET /v1/delivery/route-sheets` | Admin app | `delivery:read` |
| `GET /v1/delivery/courier-agencies` | Admin app | `delivery:read` |
| `POST /v1/delivery/cod-settlements` | Admin app | `delivery:edit` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/delivery/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
