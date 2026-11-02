# commerce service

E-commerce and retail point-of-sale: customers, delivery addresses, store settings, discount coupons, sales orders, and retail cash registers.
Owns the `commerce` schema: `customer`, `customer_address`, `store_setting`, `coupon`, `order`, `order_line`, `order_event`, `register`, `shift`, `closing`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Customer Profiles**: Customer directory, contact preferences, and delivery addresses.
- **Store Configuration & Coupons**: Discount rules, coupon validity, minimum order thresholds, and tax display.
- **Order Lifecycle**: Cart checkout, sales order creation, fulfillment stages, payment confirmations, and cancellations.
- **Point of Sale (POS)**: Retail registers, opening float, shifts, payments, and shift closings.
- **Outbox Events**: Emits `commerce.order.placed.v1`, `commerce.order.paid.v1`, `commerce.order.fulfilled.v1`, `commerce.order.cancelled.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/commerce/customers` | Admin & Web | `customers:read` / customer auth |
| `POST /v1/commerce/customers` | Admin & Web | `customers:edit` / customer self |
| `GET /v1/commerce/store-settings` | Admin & Web | `store:read` / public |
| `GET /v1/commerce/coupons` | Admin & Web | `coupons:read` / public validate |
| `GET /v1/commerce/orders` | Admin & Web | `orders:read` / customer orders |
| `POST /v1/commerce/orders` | Admin & Web | `orders:edit` / customer checkout |
| `POST /v1/commerce/orders/{id}/pay` | Web & Gateway | Service token / payment webhook |
| `GET /v1/commerce/registers` | Admin app | `pos:read` |
| `POST /v1/commerce/shifts` | Admin app | `pos:edit` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/commerce/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
