# Platform CLI Guide (`./run.sh`)

`run.sh` is the master CLI orchestrator for the entire platform — managing local Docker infrastructure, the 16 Go microservices, the 4 Next.js frontend applications, PostgreSQL migrations/seeding, quality checks, and deployments.

Running `./run.sh` with no arguments in an interactive terminal launches the **Interactive Menu**; in non-interactive shells, it prints standard CLI help (`./run.sh help`).

### Global Environment Flags

| Variable | Effect | Example |
| :--- | :--- | :--- |
| `YES=1` | Auto-confirm destructive prompts (`db reset`, `rebuild all`, `db restore`, `db test-drop`) | `YES=1 ./run.sh db reset --company zayed-group` |
| `NO_COLOR=1` | Disable ANSI color output | `NO_COLOR=1 ./run.sh doctor` |

---

## 1. Getting Started & Diagnostics

| Command | Description |
| :--- | :--- |
| `./run.sh menu` *(or `interactive`)* | Launch the interactive terminal menu. |
| `./run.sh help` *(or `-h`, `--help`)* | Print the command summary. |
| `./run.sh setup [--empty \| --company <slug>]` | Full bootstrap: installs Node/Go dependencies, initializes/syncs `.env` and secrets, starts Docker services, resets & migrates DB (`--empty` default, or `--company <slug>` / `--seed <slug>`), installs Playwright Chromium, and prints URLs. |
| `./run.sh doctor` | Verifies Node (`22+`), npm, Go (`1.25+`), Docker, Git, optional `psql`/`vercel`, `.env` validity, `node_modules`, `backend/bin/gateway`, DB connectivity, and checks all 20 service ports. |
| `./run.sh install` | Runs `npm install` across `apps/{admin,it,web,store}` and `backend/contracts`, and compiles all Go microservice binaries into `backend/bin/`. |
| `./run.sh upgrade` *(or `update`)* | Pulls latest git changes (`--ff-only`), runs `install`, syncs `.env`, applies DB migrations, and runs `build`. |
| `./run.sh urls` | Prints all browser UIs, API/infrastructure endpoints, and microservice admin/health ports (`9080–9095`). |

---

## 2. Environment & Secrets (`./run.sh env`)

Manages `.env` and `.local/service-keys.json` via `scripts/env-tool.cjs`.

| Command | Description |
| :--- | :--- |
| `./run.sh env init` | Creates `.env` from `.env.example` with generated cryptographic secrets. |
| `./run.sh env sync` | Adds any new keys from `.env.example` into `.env` without overwriting existing values. |
| `./run.sh env secrets` | Auto-generates values for any empty secret variables in `.env`. |
| `./run.sh env check [--production]` | Validates `.env` against required schema rules (use `--production` for strict production checks). |
| `./run.sh env keys` | Displays the status of required environment variables. |
| `./run.sh env service-keys` | Generates backend service key pairs in `.local/service-keys.json`. |
| `./run.sh env set <KEY> <VALUE>` | Sets or updates a key in `.env`. |
| `./run.sh env edit` | Opens `.env` in `$EDITOR` (defaults to `vi`). |

---

## 3. Docker Infrastructure & Observability (`./run.sh services` / `svc`)

| Command | Description |
| :--- | :--- |
| `./run.sh services up` *(or `start`)* | Generates service keys, builds required images, starts the full Compose stack (`postgres`, `pgbouncer`, `valkey`, `seaweedfs`, `nats`, `mailpit`, `pgadmin`, `whatsapp-sandbox`, 16 microservices, 4 frontends), waits for health, and runs `db migrate`. |
| `./run.sh services down` *(or `stop`)* | Stops all containers including `observability` and `backup` profiles. |
| `./run.sh services restart` | Runs `services down` followed by `services up`. |
| `./run.sh services status` | Shows `docker compose ps` and runs `backend health` across all 16 Go microservices. |
| `./run.sh services logs [service]` | Tails live container logs (all services or a specific container). |
| `./run.sh services observability` | Starts the `--profile observability` stack: Grafana (`:3300`), Prometheus (`:9099`), Loki, Tempo, Alloy, and OTel Collector (`:4318`). |
| `./run.sh services import-supabase [url]` | Imports a legacy `public` schema from a local Supabase Postgres URL (default `postgresql://postgres:postgres@127.0.0.1:54322/postgres`) and runs migrations. |

---

## 4. Frontend Apps: Local Dev & Docker (`./run.sh dev`, `apps`, `start`)

### Local Next.js Servers

| Command | Description |
| :--- | :--- |
| `./run.sh dev [all\|web\|admin\|it\|store]` | Starts Next.js dev servers locally (`web:3000`, `admin:3001`, `it:3002`, `store:3003`). Pass `--docker` to start containerized apps instead. |
| `./run.sh start [all\|web\|admin\|it\|store]` | Starts production-built Next.js apps (`npm start`). |
| `./run.sh build` | Builds all Go binaries (`backend/bin/*`) and all 4 Next.js production bundles. |
| `./run.sh kill-ports` | Frees ports `3000`, `3001`, `3002`, `3003`, and `8080`. |
| `./run.sh clean` | Removes build artifacts and caches across the workspace. |

### Containerized Frontend Apps (`./run.sh apps`)

| Command | Description |
| :--- | :--- |
| `./run.sh apps up [web\|admin\|it\|store\|all]` *(or `start`)* | Starts containerized frontend app(s) via Docker Compose. |
| `./run.sh apps down` *(or `stop`)* | Stops all containerized frontend apps. |
| `./run.sh apps restart [web\|admin\|it\|store\|all]` | Restarts containerized frontend app(s). |
| `./run.sh apps build [web\|admin\|it\|store\|all]` | Builds Docker image(s) for frontend app(s). |
| `./run.sh apps logs [web\|admin\|it\|store]` | Tails container logs for a frontend app (defaults to `web`). |
| `./run.sh apps status` | Shows container status for `web`, `admin`, `it`, and `store`. |

---

## 5. Backend Go Microservices (`./run.sh backend`)

| Command | Description |
| :--- | :--- |
| `./run.sh backend build` | Compiles all 16 Go microservice binaries into `backend/bin/`. |
| `./run.sh backend run <service>` | Runs a single Go microservice locally via `go run ./services/<service>/cmd/api`. |
| `./run.sh backend health` | Executes `/app healthcheck` inside each running microservice container. |
| `./run.sh backend test` | Runs the Go backend unit test suite (`cd backend && make test`). |

---

## 6. Stack Rebuild (`./run.sh rebuild`)

| Command | Description |
| :--- | :--- |
| `./run.sh rebuild all` | Rebuilds all Docker images (services + frontends), wipes volumes (`down --volumes`), restarts stack, runs migrations, and resets DB to empty bootstrap. |
| `./run.sh rebuild apps` *(or `frontend`)* | Rebuilds Docker images for `web`, `admin`, `it`, and `store`. |
| `./run.sh rebuild services` *(or `backend`)* | Rebuilds Docker images (`--no-cache`) for all 16 Go microservices. |
| `./run.sh rebuild db [args]` *(or `database`)* | Wipes database volumes, re-applies migrations, and re-initializes/seeds DB (`--empty` or `--company <slug>`). |
| `./run.sh rebuild single <container>` | Rebuilds (`--no-cache`) and recreates a single Docker Compose service (`web`, `admin`, `it`, `store`, `gateway`, `identity`, etc.). |

---

## 7. Database, Migrations & Seeding (`./run.sh db` & `company`)

| Command | Description |
| :--- | :--- |
| `./run.sh db migrate` | Applies Goose SQL migrations across all 15 stateful service schemas. |
| `./run.sh db status` *(or `integrity`, `check`)* | Prints table counts per microservice schema in PostgreSQL. |
| `./run.sh db new <service> <name>` | Creates a new numbered Goose migration SQL file in `backend/services/<service>/migrations/`. |
| `./run.sh db generate` | Runs `make gen` (sqlc) in `backend/` and builds TypeScript contracts in `backend/contracts/`. |
| `./run.sh db bootstrap` | Applies `seeds/bootstrap/seed_bootstrap.sql` (clean empty DB for IT Setup Wizard). |
| `./run.sh db seed <company> [service]` | Loads `seeds/<company>/seed.sql` and uploads `seeds/<company>/assets/` to SeaweedFS S3 (or seeds a single service via `seed.<service>.sql`). |
| `./run.sh db reset [--company <slug> \| --empty] [--yes]` | Drops/recreates local DB, runs all migrations, resets S3 buckets, and applies bootstrap or the specified company seed. |
| `./run.sh db query "<SQL>"` | Executes a SQL statement against the active database via `psql`. |
| `./run.sh db psql` | Opens an interactive `psql` session. |
| `./run.sh db backup [file]` | Dumps a custom-format backup to `backups/<db>-<timestamp>.dump` (or `[file]`). |
| `./run.sh db restore <file> [--yes] [--force]` | Restores a custom-format dump (`--force` required for non-local databases). |
| `./run.sh db test-list` | Lists `*_test` databases in PostgreSQL. |
| `./run.sh db test-drop <name_test \| --all> [--yes]` | Drops one or all `*_test` databases. |
| `./run.sh company list` | Lists all 25 available company seed slugs under `seeds/`. |

---

## 8. Quality Assurance, Testing & Audits (`./run.sh check`, `test`, `audit`)

| Command | Description |
| :--- | :--- |
| `./run.sh check` | Runs lint, `type-check`, and unit tests across `admin`, `web`, `it`, `store`, plus `make test-short` on the Go backend. |
| `./run.sh format` | Runs `npm run format` across all 4 frontend apps. |
| `./run.sh lint` | Runs `npm run lint` across all 4 frontend apps. |
| `./run.sh types` *(or `type-check`)* | Runs `npm run type-check` across all 4 frontend apps and `backend/contracts`. |
| `./run.sh test [all\|admin\|it\|web\|store\|backend]` | Runs unit tests for the specified target (defaults to `all`). |
| `./run.sh test coverage` | Runs frontend Jest/Vitest coverage and Go `go test -coverprofile=coverage.out`. |
| `./run.sh test race` | Runs Go race detector (`go test -race -p 1 ./...`). |
| `./run.sh test e2e [playwright-args...]` | Runs Playwright E2E test suites across `apps/admin`, `apps/it`, `apps/web`, and `apps/store`. |
| `./run.sh audit [all\|isolation\|security]` | Runs the 5-pillar platform audit (`scripts/audit-all.sh`), directory isolation scanner, or security/realm auditor. |

---

## 9. Workers, Cron, Docs & Deployment (`./run.sh worker`, `cron`, `docs`, `deploy`)

| Command | Description |
| :--- | :--- |
| `./run.sh worker` *(or `workers`)* | Runs `scripts/check-health.sh` against `/readyz` and `/livez` on ports `9080–9095`. |
| `./run.sh cron [base_url]` | Triggers `GET <base_url>/api/cron` with `Authorization: Bearer $CRON_SECRET` (defaults to `ADMIN_URL` / `http://localhost:3001`). |
| `./run.sh docs` | Regenerates OpenAPI specs (`gen:openapi`), TypeScript contracts (`gen:contracts`), `docs/backend/CONFIG.md` via `tools/config-doc`, and `docs/ERD.md` + `scripts/schema-meta.json` when DB is online. |
| `./run.sh deploy check` | Validates production `.env` rules and deployment config (`apps/it/scripts/check-deployment-config.cjs`). |
| `./run.sh deploy prepare` | Runs `deploy check`, confirms, runs `db migrate`, `db generate`, and `build`. |
| `./run.sh deploy migrate` | Confirms and runs `db migrate` against the configured database. |
| `./run.sh deploy vercel <admin\|web\|it\|store\|all> [--prod]` | Deploys one or all Next.js apps to Vercel via `vercel deploy`. |
| `./run.sh deploy self [all\|admin\|web\|it\|store]` | Runs `deploy prepare` and starts production servers locally (`cmd_start`). |
