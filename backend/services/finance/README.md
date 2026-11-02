# finance service

Financial management: invoices, line items, payments, expense categories, expense claims, and bank settlements.
Owns the `finance` schema: `invoice`, `invoice_line`, `payment`, `expense_category`, `expense`, `settlement`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Invoicing & Billing**: Invoice drafting, issuance, status tracking, currency and VAT handling.
- **Payments**: Recording customer payments, settlement reconciliations, and payment receipts.
- **Expenses**: Operational expenses and employee claims categorized by policy rules.
- **Outbox Events**: Emits `finance.invoice.issued.v1`, `finance.payment.recorded.v1`, `finance.expense.approved.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/finance/invoices` | Admin app | `invoices:read` |
| `POST /v1/finance/invoices` | Admin app | `invoices:edit` |
| `GET /v1/finance/payments` | Admin app | `payments:read` |
| `POST /v1/finance/payments` | Admin app | `payments:edit` |
| `GET /v1/finance/expenses` | Admin app | `expenses:read` |
| `POST /v1/finance/expenses` | Admin app | `expenses:edit` |
| `GET /v1/finance/settlements` | Admin app | `finance:read` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/finance/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
