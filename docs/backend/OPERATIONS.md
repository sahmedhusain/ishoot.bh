# Backend operations

## Local stack

`docker-compose.yml` at the repository root. Everything binds to 127.0.0.1. Values come from `.env`; `./run.sh env sync` adds
the backend variables. Run `./run.sh env secrets` separately to generate missing secrets and service keys.

| Command                                        | Starts                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `docker compose up -d --build`                 | Postgres 17, Valkey, SeaweedFS, files API/worker, gateway        |
| `docker compose --profile observability up -d` | OpenTelemetry Collector, Prometheus, Loki, Tempo, Alloy, Grafana |
| `docker compose --profile tools up -d`         | pgAdmin                                                          |

The compose Postgres uses the volume `pgdata17`, which is separate from the one older versions of this file created.
The Next.js apps use this Postgres through Prisma for unmigrated domains. Files use the Go service and S3.
See [DATA-MIGRATION](DATA-MIGRATION.md) before moving an existing installation.

Default ports (all can be changed in `.env`):

| Port | Service       |
| ---- | ------------- |
| 5432 | Postgres      |
| 6379 | Valkey        |
| 8080 | gateway       |
| 9080 | gateway admin |
| 9081 | files admin   |
| 9083 | itsm admin    |
| 8333 | SeaweedFS S3  |
| 3300 | Grafana       |
| 9091 | Prometheus    |

## Continuous integration

`.github/workflows/backend.yml` runs on changes to `backend/`, `contracts/`, `deploy/` or the compose file:

1. **Lint, scan and test:**
   - Generated code and docs must be current (`make gen-check`).
   - golangci-lint, govulncheck and gosec.
   - All tests with the race detector, with Postgres started by testcontainers.
2. **Images, one per service:**
   - Build, then a Trivy scan.
   - On `main`: push to GHCR with an SBOM and provenance, then sign with cosign.
3. **Helm:** `helm lint --strict` and kubeconform schema validation.
4. **Stack smoke test:** `docker compose up --wait`, then probe the gateway.

`.github/workflows/ci.yml` (the Next.js apps) also runs `tests/unit/catalog-sync.test.ts`. That test keeps
`contracts/catalog` equal to the TypeScript constants; `pnpm catalog:sync` rewrites the catalogue after a constant
changes.

## Kubernetes

Chart: `deploy/helm/platform`. There is one entry per service under `services:`.

- **Per service,** the chart creates:
  - a Deployment with probes on the admin port and a hardened security context;
  - a Service and a PodDisruptionBudget;
  - an HPA, a ServiceMonitor and a NetworkPolicy;
  - a ConfigMap for mounted files.
- **Ingress:** the gateway is the only service behind the Ingress, with TLS from cert-manager.
- **Secrets:** shared secret values (for example `REDIS_URL`) come from the `platform-shared` Secret, and each service
  can also have `<service>-secrets`. Both are created by External Secrets, never by the chart.
- **Per environment:** overrides live in `values-staging.yaml` and `values-production.yaml`.

### Deploy

1. Merge to `main`. The Backend workflow builds, scans, signs and pushes images tagged with the commit SHA.
2. Run the **Deploy** workflow with the environment and that SHA. It verifies the image signatures, then runs
   `helm upgrade --install --atomic`. Production waits for the GitHub environment approval.

The cluster needs ingress-nginx, cert-manager, the Prometheus Operator, External Secrets and a NetworkPolicy-capable
CNI. Postgres in Kubernetes is planned through CloudNativePG, with its built-in PgBouncer pooler and backups to
object storage.
