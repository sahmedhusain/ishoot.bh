# ⚙️ Go Microservices Backend

The backend of the platform consists of 15 fully decoupled, highly scalable Go microservices. This document provides a highly advanced technical overview of the backend's design patterns, constraints, and development workflow.

---

## 🏛️ Backend Architecture Overview

The legacy Node.js/TypeScript backend has been completely replaced by high-performance Go binaries serving via the **Echo v4** web framework.

### Core Engineering Principles
1. **Schema-per-Service Database Isolation:** Each of the 15 microservices operates within its own dedicated PostgreSQL 17 schema (e.g., `identity.*`, `commerce.*`). Services cannot perform cross-schema joins.
2. **Event-Driven via NATS JetStream:** Cross-service communication relies on NATS. When a service mutates state, it writes to a local PostgreSQL `outbox` table in the same transaction. A background relay continuously pushes these outbox messages to the NATS JetStream `EVENTS` stream.
3. **River Background Workers:** Asynchronous background jobs, retry logic, and complex background logic use **River** queueing, leveraging Postgres `FOR UPDATE SKIP LOCKED` inside the service's own database schema.
4. **API Gateway & JWKS Auth:** All frontend requests pass through the `gateway` service, which enforces API rate-limits via Valkey (Redis) and validates JWTs locally via cached EdDSA keys from the `identity` service.
5. **OpenTelemetry (OTel):** Every log and HTTP request is deeply traced with `X-Request-ID` and OTel trace propagation across the entire NATS and HTTP boundaries.

---

## 📂 Project Layout

```text
backend/
  pkg/                 Shared Go libraries (imported, never duplicated)
    authn/             Access-token verification, EdDSA JWT, JWKS, & Realms
    db/                PostgreSQL pool setup, transactions, strict timeouts
    outbox/            Transactional outbox & relay implementation
    natsx/             NATS JetStream durable consumers
    redisx/            Redis/Valkey rate limiting adapters
    httpx/             Echo server, graceful shutdown, metrics
    telemetry/         OTel span generation
  services/
    identity/          Identity domain (Staff, IT, Customer Realms)
    finance/           Finance domain (Invoices, Expenses)
    commerce/          Commerce domain (Sales Orders, Retail POS)
    [...12 more services]
  tools/               Generators and DB schema management
  Dockerfile           Unified multistage build (--build-arg SERVICE=<name>)
  Makefile             Build, test, and lint directives
```

---

## 💾 The 15 Microservices & Schemas

The following services map directly to SQL schemas found in `services/*/migrations/*.sql`:

| Service | Primary SQL Tables |
| :--- | :--- |
| **Audit** | `audit.event` |
| **CMS** | `cms.page`, `cms.article`, `cms.content_snapshot` |
| **Commerce** | `commerce.sales_order`, `commerce.customer`, `commerce.retail_shift` |
| **Delivery** | `delivery.shipment`, `delivery.route_sheet`, `delivery.delivery_zone` |
| **Files** | `files.upload_object` |
| **Finance** | `finance.invoice`, `finance.expense`, `finance.bank_settlement` |
| **HR** | `hr.employee`, `hr.payroll_run`, `hr.leave_request` |
| **Identity** | `identity.account`, `identity.mfa_recovery_code` |
| **Inventory** | `inventory.product`, `inventory.stock_level`, `inventory.warehouse` |
| **ITSM** | `itsm.ticket`, `itsm.sla_policy`, `itsm.ticket_event` |
| **Notify** | `notify.message`, `notify.attachment` |
| **Realtime** | `realtime.status`, `realtime.status_window` |
| **Sales** | `sales.deal`, `sales.contact`, `sales.quotation` |
| **System** | `system.company`, `system.document_sequence` |
| **Workflow** | `workflow.approval_request`, `workflow.task`, `workflow.official_letter` |

> For complete visual ERDs, refer to [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

---

## 🛠️ Development & Make Commands

Requirements: **Go 1.24+**, **Docker**, and `make`.

Run all tasks from within the `backend/` directory:

```bash
make help        # List all available commands
make check       # The primary CI command (linting, vulnerability checks, tests)
make test-short  # Fast unit tests (skips Docker/Postgres tests)
make test        # Full test suite including Postgres integration tests via testcontainers
```

### Starting the Backend Locally

Normally orchestrated by `./run.sh dev` from the project root. To run backend services individually:

```bash
cd ../
./run.sh env sync                  # Sync environment variables
docker compose up -d --build       # Spin up Postgres, Valkey, NATS, and Gateway
```

### Development Rules
- **No Hardcoding:** All configurations (ports, SLAs, limits) must be mapped via `settings.Config` reading from `.env`.
- **Error Handling:** Always use the RFC 9457 standard via `problem.Problem`. Untyped internal errors are heavily masked and never expose stack traces to the frontend.
- **Port Strategy:** Services bind to two ports. `:8080` for public HTTP gateway access, and `:9090` for internal prometheus metrics and readiness probes (`/readyz`, `/livez`). Internal ports are never exposed externally.
