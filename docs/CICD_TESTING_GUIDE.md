# CI/CD, Kubernetes, Terraform & GitHub Actions Testing Guide

This guide documents every automated and manual test in the CI/CD pipeline across **GitHub Actions**, **Kubernetes / Helm**, **Terraform**, **Docker Compose**, and **application quality gates**.

---

## 1. Automated vs. Manual Tests Overview

| Workflow / Area | File | Execution Mode | Triggers | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Main CI** | `.github/workflows/ci.yml` | **Automated** (also manual via `workflow_dispatch`) | `pull_request`, `push` (`main`) | Frontend lint, types, unit tests, DB migrations, all 25 seed profiles, Go tests, Playwright E2E |
| **Backend CI** | `.github/workflows/backend.yml` | **Automated** (also manual via `workflow_dispatch`) | `pull_request`, `push` (`main`) on `backend/**`, `docker-compose.yml` | Go codegen parity, lint, `govulncheck`, `gosec`, race tests, container builds + Trivy scan + Cosign signing, Helm validation, Compose smoke test |
| **Audit & Guardrails** | `.github/workflows/audit.yml` | **Automated** (also manual via `workflow_dispatch`) | `pull_request`, `push` (`main`, `feat/**`) | Seed parity, codebase isolation, OpenAPI Spectral lint, contract freshness, monorepo type-check, Newman API smoke tests |
| **Infrastructure** | `.github/workflows/infra.yml` | **Automated** (also manual via `workflow_dispatch`) | `pull_request`, `push` (`main`) on `infra/**`, `backend/deploy/helm/**` | Terraform `fmt` + `validate`, Kubernetes manifest `kubeconform` validation, Helm `lint` + multi-env schema validation |
| **Deploy** | `.github/workflows/deploy.yml` | **Manual Only** (`workflow_dispatch`) | Manual dispatch with `environment` (`staging`/`production`) and `image_tag` (40-char SHA) | Verifies Cosign image signatures and deploys Helm release to Kubernetes (`production` requires GitHub Environment approval) |

> **Why `deploy.yml` is Manual:** Production and staging cluster deployments require choosing an immutable commit SHA built on `main`, verifying its Sigstore Cosign signature, and passing GitHub Environment protection rules (`production` approval gate). All validation, security scanning, and smoke tests run **automatically** on every PR and push.

---

## 2. GitHub Actions Workflows in Detail

### A. Main CI (`.github/workflows/ci.yml`)

1. **`static` (Lint, types and static checks)**
   - Installs dependencies per app (`apps/admin`, `apps/it`, `apps/web`, `apps/store`).
   - Runs `npm run lint`, `npm run type-check`, and `npm test` (`CI=true`) for all 4 frontend apps.
2. **`database` (Go migrations, bootstrap and company profiles)**
   - Initializes `.env` with `node scripts/env-tool.cjs init` and starts `postgres` via Docker Compose.
   - Verifies empty schema bootstrap idempotency (`./run.sh db reset --empty --yes` + `./run.sh db bootstrap`).
   - Runs Go backend tests (`make -C backend test`).
   - Loops through all **25 company seed profiles** under `seeds/*/` and runs `./run.sh db seed <profile>` + `node scripts/verify-seed-dates.js`.
3. **`e2e` (End-to-end Playwright suite)**
   - Starts the backend stack via `./.github/actions/backend-stack`, seeds `zayed-group`, builds production Next.js bundles for all 4 apps, installs Chromium, and executes `npm run test:e2e` across `admin`, `it`, `web`, and `store`.

### B. Backend CI (`.github/workflows/backend.yml`)

1. **`go` (Lint, scan and test)**
   - `make gen-check`: Verifies `sqlc` and generated code are up to date.
   - `make lint`: Runs Go linters (`golangci-lint`).
   - `make vuln`: Runs `govulncheck` for known Go CVEs.
   - `make sec`: Runs `gosec` static security analysis.
   - `go test -race -count=1 -coverprofile=coverage.out ./...`: Runs all Go unit and Testcontainers Postgres tests with the race detector.
2. **`images` (18-container build, Trivy scan, SBOM & Cosign)**
   - Builds Docker images for all 16 microservices + `db-roles` + `whatsapp-sandbox`.
   - Scans every image with `aquasec/trivy:0.59.1` failing on `HIGH` or `CRITICAL` (with `--ignore-unfixed`).
   - On `push` to `main`: pushes to `ghcr.io`, attaches SBOM + provenance, and signs each digest with `cosign sign --yes`.
3. **`helm` (Helm chart lint & schema validation)**
   - Runs `helm lint --strict` and validates rendered templates (`default`, `values-staging.yaml`, `values-production.yaml`) against Kubernetes schemas with `kubeconform`.
4. **`stack` (Local stack smoke test)**
   - Boots the full Compose stack via `./.github/actions/backend-stack`.
   - Probes `/readyz` on `gateway` (`9080`), `files` (`9081`), `identity` (`9082`), `itsm` (`9083`), and `system` (`9084`).
   - Runs `/app healthcheck` on `itsm-worker` and `files-worker`, and verifies gateway 404 routing (`http://127.0.0.1:8080/unknown`).

### C. Audit & Architecture Guardrails (`.github/workflows/audit.yml`)

- **Seed Parity**: Resets DB with `--company ishoot` and runs `scripts/verify-seed-dates.js`.
- **Pillar 2 (Isolation)**: `npm run check:isolation` ensures no cross-app or forbidden imports.
- **Pillar 3 (OpenAPI & Contracts)**: Regenerates `docs/api/combined-openapi.yaml`, lints with `@stoplight/spectral-cli`, regenerates frontend contracts (`npm run gen:contracts`), and asserts `git diff --exit-code` across `apps/*/contracts`.
- **Pillar 4 (Monorepo Type-Check)**: `npm run type-check`.
- **Pillar 3 (Newman API Smoke Tests)**: Boots all containers, runs `./scripts/check-health.sh` (all 16 services on `:9080–9095`), generates Postman artifacts, and runs `newman run docs/api/combined-openapi.postman_collection.json`.

### D. Infrastructure Validation (`.github/workflows/infra.yml`)

- **`terraform`**: Runs `terraform fmt -check -recursive`, `terraform init -backend=false`, and `terraform validate` inside `infra/terraform/`.
- **`kubernetes`**: Runs `kubeconform -strict -summary` on all manifests in `infra/k8s/`.
- **`helm`**: Runs `helm lint --strict` and `kubeconform -strict` on `backend/deploy/helm/platform` across default, staging, and production value files.

### E. Deployment Workflow (`.github/workflows/deploy.yml` — Manual)

Requires:
- Repository secret: `KUBECONFIG` (base64/raw kubeconfig for the target cluster).
- GitHub Environments: `staging` and `production` (configure required reviewers on `production`).
- Input `image_tag`: 40-character commit SHA whose images were built & Cosign-signed on `main`.

---

## 3. Running Kubernetes & Helm Tests Locally

### Helm Chart (`backend/deploy/helm/platform`)

```bash
# 1. Strict Helm lint
helm lint --strict backend/deploy/helm/platform

# 2. Render & validate all 3 environments against Kubernetes schemas
helm template ci backend/deploy/helm/platform | \
  docker run --rm -i ghcr.io/yannh/kubeconform:v0.6.7 -strict -summary -ignore-missing-schemas -
for vf in values-staging.yaml values-production.yaml; do
  helm template ci backend/deploy/helm/platform -f "backend/deploy/helm/platform/$vf" | \
    docker run --rm -i ghcr.io/yannh/kubeconform:v0.6.7 -strict -summary -ignore-missing-schemas -
done

# 3. Server-side dry-run against a connected cluster (optional)
helm upgrade --install platform backend/deploy/helm/platform \
  -n platform --dry-run=server \
  -f backend/deploy/helm/platform/values-staging.yaml
```

### Raw Kubernetes Manifests (`infra/k8s/`)

```bash
# 1. Schema validation (offline, no cluster required)
docker run --rm -v "$(pwd)/infra/k8s:/k8s" \
  ghcr.io/yannh/kubeconform:v0.6.7 -strict -summary /k8s/

# 2. Client/server dry-run with kubectl (if cluster is connected)
kubectl apply --dry-run=client -f infra/k8s/
```

---

## 4. Running Terraform Tests Locally

All Terraform definitions live in `infra/terraform/` (`main.tf`, `variables.tf`, `outputs.tf`).

```bash
# Using local terraform CLI:
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate

# Or using Docker (no local Terraform installation needed):
docker run --rm -v "$(pwd)/infra/terraform:/tf" -w /tf hashicorp/terraform:1.9 fmt -check -recursive
docker run --rm -v "$(pwd)/infra/terraform:/tf" -w /tf hashicorp/terraform:1.9 init -backend=false
docker run --rm -v "$(pwd)/infra/terraform:/tf" -w /tf hashicorp/terraform:1.9 validate
```

### Live Cluster Plan & Apply (Manual / Operator Only)

> **Never** run `terraform apply` from unapproved CI runs against production clusters.

```bash
cd infra/terraform
terraform plan -var="environment=staging" -var="namespace=platform-staging" -var="image_tag=<commit-sha>"
terraform apply -var="environment=staging" -var="namespace=platform-staging" -var="image_tag=<commit-sha>"
```

---

## 5. Local Pre-Push Verification Checklist

Before pushing changes to GitHub, run:

```bash
./run.sh env check          # Verify .env matches .env.example
./run.sh check              # Lint, type-check, and unit tests (apps + Go backend)
./run.sh audit              # Isolation, OpenAPI, contracts, and health checks
```
