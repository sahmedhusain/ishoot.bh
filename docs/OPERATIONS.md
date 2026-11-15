# Operations & Deployment Runbook

This runbook covers system environment variables, local Docker services, background workers, domain management, deployment procedures, and production setup.

---

## 1. Environment Variable Architecture

Environment variables are defined in `.env.example` and read by the frontend Next.js applications, Go backend microservices, background workers, and test scripts.

To manage environment variables locally:
```bash
# Generate .env with random secure secrets
./run.sh env init
./run.sh env secrets

# Sync new variables from .env.example without overwriting values
./run.sh env sync

# Validate current configuration values
./run.sh env check
```

### Core Environment Variable Reference

| Variable | Scope | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | Microservices | Yes | PostgreSQL connection string for PgBouncer / application queries. |
| `DATABASE_DIRECT_URL` | Migrations | Yes | Direct PostgreSQL connection for Goose schema migrations. |
| `API_URL` | Applications | Yes | Server-side URL for the Go API Gateway (default: `http://127.0.0.1:8080`). |
| `ADMIN_SERVICE_KEY` | Admin App | Yes | Service signing key for Admin application calls to gateway. |
| `WEB_SERVICE_KEY` | Web App | Yes | Service signing key for Web application calls to gateway. |
| `STORE_SERVICE_KEY` | Store App | Yes | Service signing key for Storefront application calls to gateway. |
| `IT_SERVICE_KEY` | IT App | Yes | Service signing key for IT dashboard calls to gateway. |
| `S3_ENDPOINT` | Files Service | Yes | S3-compatible object storage endpoint (default: `http://seaweedfs:8333`). |
| `S3_ACCESS_KEY_ID` | Files Service | Yes | Storage access key credential. |
| `S3_SECRET_ACCESS_KEY` | Files Service | Yes | Storage secret access key credential. |
| `IDENTITY_ISSUER` | Security | Yes | Issuer URI for identity Ed25519 JWT access tokens. |
| `IDENTITY_JWKS_URL` | Security | Yes | Public JWKS endpoint for in-memory token signature verification. |
| `ENCRYPTION_KEY` | Integrations | Yes | 32-character key for AES-256-GCM encryption of integration secrets. |
| `MFA_ENCRYPTION_KEY` | Security | Yes | Base64 32-byte key for encrypting TOTP authenticator secrets. |
| `REVALIDATION_SECRET` | CMS | Yes | Secret token for triggering ISR page revalidation. |
| `CRON_SECRET` | System | Production | Bearer token for triggering scheduled maintenance calls (`/api/cron`). |

---

## 2. Local Stack Port Mapping

When executing `./run.sh services up` (and `./run.sh services observability` for the telemetry stack), the local Docker Compose stack binds to `127.0.0.1` and exposes the following services:

| Component / Service | Address / URL | Internal Container Port | Profile / Access | Description |
|---|---|---|---|---|
| **Web Application** | `http://localhost:3000` | 3000 | Default (Browser) | Public marketing & services website (`/en`, `/ar`) |
| **Admin Application** | `http://localhost:3001` | 3001 | Default (Browser) | Enterprise business system |
| **IT Dashboard** | `http://localhost:3002` | 3002 | Default (Browser) | Infrastructure & operations desk |
| **Store Application** | `http://localhost:3003` | 3003 | Default (Browser) | Customer e-commerce storefront (`/en`, `/ar`) |
| **Mailpit UI / SMTP** | `http://localhost:8025` / `127.0.0.1:1025` | 8025 / 1025 | Default (Browser) | Local email inbox & SMTP testing catcher |
| **WhatsApp Sandbox** | `http://localhost:8095` | 8080 | Default (Browser) | Local mock server for WhatsApp Cloud API |
| **pgAdmin** | `http://localhost:5050` | 80 | Default (Browser) | PostgreSQL web administration UI |
| **NATS Monitor / Broker** | `http://127.0.0.1:8222` / `127.0.0.1:4222` | 8222 / 4222 | Default (Browser) | JetStream monitoring UI & event broker |
| **Grafana** | `http://localhost:3300` | 3000 | `observability` (Browser) | Metrics, logs & trace dashboards (`./run.sh services observability`) |
| **Prometheus** | `http://localhost:9099` | 9090 | `observability` (Browser) | Metrics store & query UI (`./run.sh services observability`) |
| **API Gateway** | `http://127.0.0.1:8080` | 8080 | Default (API) | Single public HTTP reverse proxy entry point |
| **Identity API** | `http://127.0.0.1:8082` | 8080 | Default (API) | Direct tri-realm authentication & JWKS service |
| **PostgreSQL 17** | `127.0.0.1:5432` | 5432 | Default (TCP) | Direct database cluster (migrations & admin) |
| **PgBouncer** | `127.0.0.1:6432` | 6432 | Default (TCP) | Transaction-mode connection pooler (`DATABASE_URL`) |
| **Valkey / Redis** | `127.0.0.1:6379` | 6379 | Default (TCP) | Rate limits & presence cache |
| **SeaweedFS S3** | `http://127.0.0.1:8333` | 8333 | Default (HTTP) | S3-compatible object storage |
| **OTel Collector** | `http://127.0.0.1:4318` | 4318 | `observability` (OTLP) | OpenTelemetry OTLP/HTTP trace receiver |
| **Microservice Probes** | `127.0.0.1:9080–9095` | 9090 | Default (Internal) | `/livez`, `/readyz`, `/metrics` (`gateway:9080` … `workflow:9095`) |

---

## 3. Background Workers & Scheduled Tasks

Background processing handles outbox delivery, email dispatch, notification delivery, ticket SLA monitoring, and file cleanup.

### River Background Workers (Go Backend)

Go microservices utilize **River** (PostgreSQL-backed queue) for background execution:

| Worker Service | Primary Background Jobs | Trigger / Schedule |
|---|---|---|
| `files` | `files.cleanup_expired_uploads` | Periodic sweep for unclaimed private uploads. |
| `itsm` | `itsm.mark_sla_breaches` | Every 1 minute; flags overdue support tickets. |
| `notify` | `notify.dispatch_messages` | Real-time dispatch of queued email and WhatsApp. |
| `identity` | `identity.clean_expired_sessions` | Cleans expired TOTP enrollment secrets and sessions. |

### Scheduled Maintenance Cron (`/api/cron`)

The Admin application provides a consolidated cron endpoint `/api/cron` authenticated via `Authorization: Bearer <CRON_SECRET>`. Schedule this job every 5 to 15 minutes in production.

Each execution performs:
1. Retries failed notification email and revalidation events.
2. Removes expired upload objects and stale sessions.
3. Flags overdue invoices and sends document expiration reminders.
4. Auto-expires open payment attempts older than 60 minutes and releases held stock.
5. Queries courier APIs for tracking updates on active shipments.
6. Dispatches scheduled marketing email broadcasts.

---

## 4. Domain & DNS Configuration

Custom domains are configured in **Settings → Website** or the IT Dashboard (**Website / Site Settings**).

### Recommended DNS Records

| Service Type | Subdomain Pattern | Record Type | Target Value |
|---|---|---|---|
| **Public Website** | `example.com` (Apex) | `A` | Server IP or Platform Ingress IP |
| **Public Website** | `www.example.com` | `CNAME` | `example.com` or CNAME provider host |
| **Admin System** | `admin.example.com` | `CNAME` | Server IP or Platform Ingress IP |
| **IT Operations** | `it.example.com` | `CNAME` | Server IP or Platform Ingress IP |

---

## 5. Deployment Procedures

### Production Deployment Steps

1. **Database & Storage Provisioning**: Provision PostgreSQL 17 with PgBouncer connection pooling. Create private S3 storage buckets (`public-assets` and `private-assets`).
2. **Environment Validation**:
   ```bash
   ./run.sh deploy check
   ```
3. **Database Migration**:
   ```bash
   ./run.sh db migrate
   ./run.sh db bootstrap
   ```
4. **Build & Launch Applications**:
   ```bash
   ./run.sh deploy prepare
   ./run.sh start
   ```
5. **Verify Health Probes**:
   Query `/readyz` and `/livez` across all microservices and gateway instances.
