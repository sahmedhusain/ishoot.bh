# Services

Each service has its own README with endpoints, events, tables, configuration, and runbook.

| Service | Owns | Status |
|---|---|---|
| [gateway](../../backend/services/gateway/README.md) | Routing, token check, rate limits (no data) | Active |
| [identity](../../backend/services/identity/README.md) | Staff, customer and IT accounts; sessions, refresh tokens, MFA; roles, permissions, data scopes; OAuth | Active; cutover pending final verification phase |
| [system](../../backend/services/system/README.md) | Company settings, setup wizard, modules, integrations (encrypted credentials), domains, operations | Active |
| [files](../../backend/services/files/README.md) | Upload records, streamed S3 bytes, type and size checks, River cleanup | Active |
| [notify](../../backend/services/notify/README.md) | E-mail and WhatsApp delivery with retries; in-app notifications and preferences | Active |
| [realtime](../../backend/services/realtime/README.md) | Live updates to browsers (Server-Sent Events over NATS hints); presence, meetings, leaves | Active |
| [audit](../../backend/services/audit/README.md) | The audit trail: every published event, append-only, searched from the IT dashboard | Active |
| [itsm](../../backend/services/itsm/README.md) | IT tickets, categories and SLAs, system-health view for the IT dashboard | Active |
| [workflow](../../backend/services/workflow/README.md) | Approval engine, signatures, documents, letters, tasks, calendar events | Implemented |
| [cms](../../backend/services/cms/README.md) | Website content, pages, articles, reviews, FAQs, statistics, snapshots, revalidation | Implemented |
| [sales](../../backend/services/sales/README.md) | Inquiries and service desk, CRM contacts, deals, quotations, marketing campaigns | Implemented |
| [finance](../../backend/services/finance/README.md) | Invoices, payments, expenses, expense claims, bank settlements | Implemented |
| [hr](../../backend/services/hr/README.md) | Departments, employees, leave requests, attendance tracking, payroll runs | Implemented |
| [inventory](../../backend/services/inventory/README.md) | Warehouses, categories, products, variants, stock levels, batches, movements, counts | Implemented |
| [commerce](../../backend/services/commerce/README.md) | Customers, addresses, store settings, coupons, sales orders, retail registers and shifts | Implemented |
| [delivery](../../backend/services/delivery/README.md) | Delivery settings, zones, slots, fleet vehicles, route sheets, shipments, courier adapters, COD | Implemented |

The IT dashboard ([apps/it](../../apps/it/README.md)) is the IT team's front end for these services.

Every service exposes the same admin endpoints on port 9090: `/livez`, `/readyz`, `/metrics`,
`GET|PUT /runtime/log-level` and, when `ADMIN_ENABLE_PPROF=true`, `/debug/pprof/`.
