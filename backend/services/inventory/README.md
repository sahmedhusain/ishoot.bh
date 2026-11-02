# inventory service

Inventory and warehouse management: product catalogue, variants, warehouses, stock levels, batch tracking, and stock movements.
Owns the `inventory` schema: `warehouse`, `location`, `category`, `product`, `variant`, `stock_level`, `batch`, `movement`, `count`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Product Catalogue**: Products, SKUs, barcodes, variants, and product categorization.
- **Warehousing**: Multi-warehouse and location bins.
- **Stock Ledger**: Append-only stock movements, adjustments, and transfer receipts.
- **Batches & Expiry**: Batch-tracked stock, lot numbers, and expiration dates.
- **Stock Audits**: Physical stock counts and variance reconciliations.
- **Outbox Events**: Emits `inventory.stock.adjusted.v1`, `inventory.transfer.completed.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/inventory/warehouses` | Admin app | `inventory:read` |
| `POST /v1/inventory/warehouses` | Admin app | `inventory:edit` |
| `GET /v1/inventory/categories` | Admin app | `inventory:read` |
| `GET /v1/inventory/products` | Admin & Web | `inventory:read` / public catalogue |
| `POST /v1/inventory/products` | Admin app | `inventory:edit` |
| `GET /v1/inventory/levels` | Admin app | `inventory:read` |
| `POST /v1/inventory/movements` | Admin app | `inventory:edit` |
| `GET /v1/inventory/counts` | Admin app | `inventory:read` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/inventory/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
