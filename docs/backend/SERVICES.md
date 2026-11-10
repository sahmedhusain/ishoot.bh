# Microservices Architecture & Directory Index

The platform backend is composed of **16 domain-scoped Go microservices**. Each service owns its dedicated PostgreSQL schema and communicates with other services asynchronously via **NATS JetStream** events using the **Transactional Outbox Pattern**.

---

## Microservices Overview & Status Matrix

| Service | Directory Path | Database Schema | Primary Responsibilities | Status |
|---|---|---|---|---|
| **gateway** | [`backend/services/gateway`](../../backend/services/gateway/README.md) | *(None)* | Reverse proxy routing, Ed25519 token check, rate limiting, and session status probes. | **Active** |
| **identity** | [`backend/services/identity`](../../backend/services/identity/README.md) | `identity` | Staff, Customer, and IT account realms, Argon2id passwords, TOTP MFA, Ed25519 JWKS issuing. | **Active** |
| **system** | [`backend/services/system`](../../backend/services/system/README.md) | `system` | Company settings, feature toggles, encrypted integration keys, site domains, document numbering. | **Active** |
| **files** | [`backend/services/files`](../../backend/services/files/README.md) | `files` | S3-compatible file metadata, upload authorization, checksum verification, River cleanup. | **Active** |
| **notify** | [`backend/services/notify`](../../backend/services/notify/README.md) | `notify` | E-mail (Resend/SMTP), WhatsApp Cloud API dispatch, retry queues, user notification inboxes. | **Active** |
| **realtime** | [`backend/services/realtime`](../../backend/services/realtime/README.md) | `realtime` | Server-Sent Events (SSE) streaming, user connection tracking, presence states, calendar windows. | **Active** |
| **audit** | [`backend/services/audit`](../../backend/services/audit/README.md) | `audit` | Append-only security audit trail for all published system events. | **Active** |
| **itsm** | [`backend/services/itsm`](../../backend/services/itsm/README.md) | `itsm` | IT support tickets, categories, SLA breach tracking, comments, attachments. | **Active** |
| **cms** | [`backend/services/cms`](../../backend/services/cms/README.md) | `cms` | Dynamic block-based pages, articles, customer reviews, FAQs, statistics, snapshots. | **Active** |
| **sales** | [`backend/services/sales`](../../backend/services/sales/README.md) | `sales` | CRM contacts, lead inquiries, pipeline deal stages, commercial quotations, campaigns. | **Active** |
| **finance** | [`backend/services/finance`](../../backend/services/finance/README.md) | `finance` | Invoices, payments, expense claims, tax calculation, bank settlements. | **Active** |
| **workflow** | [`backend/services/workflow`](../../backend/services/workflow/README.md) | `workflow` | Multi-step approval requests, digital client signatures, official letters, tasks. | **Active** |
| **hr** | [`backend/services/hr`](../../backend/services/hr/README.md) | `hr` | Departments, employee directory, GOSI social insurance, leave requests, attendance, payroll. | **Active** |
| **inventory** | [`backend/services/inventory`](../../backend/services/inventory/README.md) | `inventory` | Warehouses, stock locations, products, variants, append-only stock ledger, counts. | **Active** |
| **commerce** | [`backend/services/commerce`](../../backend/services/commerce/README.md) | `commerce` | Store customers, delivery addresses, store settings, discount coupons, sales orders, POS. | **Active** |
| **delivery** | [`backend/services/delivery`](../../backend/services/delivery/README.md) | `delivery` | Delivery zones, time slots, vehicle fleet, route sheets, shipment milestones, driver COD. | **Active** |

---

## Admin Endpoints Standard

Every microservice exposes standard administrative management endpoints on internal port `:9090`:

* **`/livez`**: Liveness probe endpoint.
* **`/readyz`**: Readiness probe endpoint (validates PostgreSQL and cache connectivity).
* **`/metrics`**: Prometheus metrics endpoint.
* **`/runtime/log-level`**: `GET`/`PUT` endpoint to inspect or adjust log level dynamically (`debug`, `info`, `warn`, `error`).
* **`/debug/pprof/`**: Go pprof diagnostic profiling endpoint (enabled when `ADMIN_ENABLE_PPROF=true`).
