# Backend Operations & Deployment Runbook

This runbook details local infrastructure management, database connection pooling, event bus monitoring, IT administrator emergency recovery, mail/WhatsApp testing, and Kubernetes Helm deployment.

---

## 1. Local Infrastructure Stack

Local infrastructure services run via `docker-compose.yml` at the repository root. All services bind to `127.0.0.1`.

```bash
# Launch core platform stack (Postgres 17, Valkey, SeaweedFS, NATS, Mailpit, Gateway, Microservices)
docker compose up -d --build

# Launch telemetry & observability stack (Prometheus, Loki, Tempo, Alloy, Grafana)
docker compose --profile observability up -d

# Launch database management tools (pgAdmin)
docker compose --profile tools up -d
```

### Infrastructure Port Mapping

| Port | Service Component | Internal Container Port | Description |
|---|---|---|---|
| **5432** | PostgreSQL 17 Cluster | 5432 | Direct database connection ( Goose migrations ). |
| **6432** | PgBouncer Pooler | 6432 | Application connection pooler (`DATABASE_URL`). |
| **6379** | Valkey / Redis | 6379 | Rate limiting counters & presence cache. |
| **8080** | API Gateway | 8080 | Microservices HTTP reverse proxy. |
| **8333** | SeaweedFS S3 | 8333 | S3 object storage endpoint. |
| **4222 / 8222** | NATS JetStream | 4222 / 8222 | Event broker & JetStream monitoring dashboard. |
| **1025 / 8025** | Mailpit SMTP / Web | 1025 / 8025 | Local email inbox testing server. |
| **8095** | WhatsApp Sandbox | 8095 | Mock server for WhatsApp Cloud API. |
| **3300** | Grafana | 3000 | Observability dashboard (`admin` / `GRAFANA_ADMIN_PASSWORD`). |

---

## 2. Database Logins & PgBouncer Pooling

### Schema Isolation & Roles (`tools/db-roles`)
Each microservice connects using a dedicated login (`svc_<service>`) created by `tools/db-roles`. Passwords are generated via `./run.sh env secrets`. `db-roles` runs automatically before schema migrations during stack initialization.

### Connection Pooling Architecture
* **Application Queries (`DATABASE_URL`)**: Route through **PgBouncer** in transaction pooling mode on port `6432`.
* **Migrations & Workers (`DATABASE_DIRECT_URL`)**: Connect directly to PostgreSQL on port `5432` to allow session locks and River queue processing.

---

## 3. Event Bus & Outbox Relay Monitoring

Each microservice writes published events into its local `outbox` table within the same PostgreSQL transaction modifying business data.

* **Outbox Relay**: Background relays poll `outbox` tables and publish pending events to NATS JetStream stream `EVENTS`.
* **Event Stream Inspection**:
  ```bash
  docker run --rm --network platform_default natsio/nats-box nats -s nats://nats:4222 stream view EVENTS
  ```
* **Event Schemas**: Defined under `contracts/events/`.

---

## 4. Emergency IT Administrator Recovery

If an IT administrator loses access to their authenticator device and all single-use recovery codes, an operator with database and MFA key access can execute offline account recovery.

```bash
docker compose run --rm identity recover-it -email it-admin@example.com -actor operator-101
```

### Recovery Actions Executed
1. Prompts for a new administrator password without echo (minimum 14 characters).
2. Replaces the password hash, enrolled TOTP secret, and single-use recovery codes.
3. Revokes all existing session families for the account.
4. Emits `identity.user.recovered` to the outbox for audit logging.

---

## 5. Kubernetes Helm Deployment

Chart directory: `deploy/helm/platform/`.

### Helm Chart Resources Generated per Service
* **Deployment**: Distroless container with readiness/liveness probes.
* **Service & ServiceMonitor**: Service discovery and Prometheus scraping.
* **PodDisruptionBudget & HPA**: High availability and horizontal scaling.
* **NetworkPolicy**: Strict ingress/egress filtering (deny-by-default).

### Deployment Workflow
```bash
# Lint Helm chart strictly
helm lint --strict deploy/helm/platform

# Dry-run template rendering
helm template platform deploy/helm/platform -f deploy/helm/platform/values-production.yaml

# Deploy/Upgrade release in Kubernetes
helm upgrade --install platform deploy/helm/platform -n platform --atomic
```
