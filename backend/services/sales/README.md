# sales service

CRM and sales lifecycle: contacts, customer inquiries, pipeline deals, commercial quotations, and outreach campaigns.
Owns the `sales` schema: `contact`, `deal`, `inquiry`, `quotation`, `campaign`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **CRM Contacts & Accounts**: Central client directory with activity records, company profiles, and contact persons.
- **Inquiries**: Service desk inquiries submitted from the website or entered by staff.
- **Deals & Pipeline**: Pipeline stages, probability, win/loss reasons, and deal progression.
- **Quotations**: Line-item quotations with automated tax calculation, document status, and acceptance workflows.
- **Marketing Campaigns**: Outreach campaigns, segment targeting, and engagement tracking.
- **Outbox Events**: Emits `sales.deal.won.v1`, `sales.inquiry.created.v1`, `sales.quotation.issued.v1`, `sales.quotation.accepted.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/sales/contacts` | Admin app | `crm:read` |
| `POST /v1/sales/contacts` | Admin app | `crm:edit` |
| `GET /v1/sales/deals` | Admin app | `crm:read` |
| `POST /v1/sales/deals` | Admin app | `crm:edit` |
| `GET /v1/sales/inquiries` | Admin app | `inquiries:read` |
| `POST /v1/sales/inquiries` | Admin & Web | `inquiries:edit` / public submit |
| `GET /v1/sales/quotations` | Admin app | `quotations:read` |
| `POST /v1/sales/quotations` | Admin app | `quotations:edit` |
| `GET /v1/sales/campaigns` | Admin app | `campaigns:read` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/sales/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
