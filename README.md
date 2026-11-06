# Business platform

A complete business system, IT operational dashboard, and bilingual public website, in Arabic and English, that any company can install and brand as its own. Nothing about a specific company lives in the code: each installation sets its name, activity, colours, fonts, logos and configuration in a first-run setup wizard, or from a profile in [`company/`](company/README.md).

**The admin system (`apps/admin`)** covers CRM and deals, quotations, invoices and payments, expenses and claims, HR and payroll, assets, approvals, documents and letters, calendar and announcements; products, stock and purchasing; an online store with customer accounts, online payments (seven gateways) and delivery (zones, time slots, own fleet with a driver's phone view, courier agencies); tasks and projects, customer service, marketing campaigns and broadcasts, public relations and legal matters; and a report catalogue with CSV, Excel and PDF exports. Optional areas are modules a company switches on.

**The IT dashboard (`apps/it`)** is the central operational portal for IT teams: ticket queues and SLAs, system health checks, database maintenance, background jobs, staff access administration, audit trail inspection, and module/domain configuration.

**The website (`apps/web`)** is built from the admin: pages made of blocks, menus, articles, a catalogue (works, products, listings or case studies, by activity), a cart and checkout, customer accounts, delivery tracking and a press page.

**The backend (`backend/`)** is a suite of 16 modular Go microservices communicating via an API gateway, transactional outbox events over NATS JetStream, and River background workers with PostgreSQL schema-per-service isolation.

## Repository

```
apps/
  admin/        Next.js admin system (port 3001)
  it/           Next.js IT operational dashboard (port 3002)
  web/          Next.js public website, store and customer accounts (port 3000)
backend/
  services/     16 Go microservices (identity, system, files, notify, realtime, itsm, audit,
                gateway, cms, sales, finance, workflow, hr, inventory, commerce, delivery)
  pkg/          Shared Go libraries (httpx, outbox, authn, db, catalog, telemetry, logx)
contracts/      Canonical event schemas, catalog definitions, and test fixtures
company/
  profiles/     One folder per company: identity, theme, logos, fonts, media (demo = neutral example)
  seed/         Demo business data
  tools/        Installs a profile into the database and file storage
scripts/        Workspace check suites, workers, bootstrap, reset and the .env tool
docs/           Guides and architecture documentation
run.sh          One entry point for setup, services, databases, development, tests and deployment
```

## Quick start

Prerequisites: Node 22 or newer, Go 1.24+, and Docker.

```bash
./run.sh setup
```

This installs dependencies, creates `.env` from [`.env.example`](.env.example) with generated secrets, starts the local Compose stack (Postgres 17, Valkey, SeaweedFS, files and gateway) and builds the demo database. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env` when it asks, then:

```bash
./run.sh dev
```

- Admin: http://localhost:3001
- IT Dashboard: http://localhost:3002
- Website: http://localhost:3000

| Start with               | Command                              | Result                                                                                     |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| The demo company         | `./run.sh db reset`                  | The fictional company in `company/profiles/demo`, with full demo data (`--light` for less) |
| Your own company profile | `./run.sh db reset --profile <name>` | Your brand on demo data (`./run.sh db bootstrap --profile <name>` for a real installation) |
| A blank company          | `./run.sh db reset --empty`          | The admin opens the first-run setup wizard                                                 |

[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) walks through each option, including how to create a company profile. `./run.sh doctor` checks your tools, `.env`, database and ports.

## `run.sh`

`./run.sh help` lists everything. The main commands:

| Area            | Commands                                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Getting started | `setup [--light\|--empty]` · `doctor` · `install` · `upgrade` (pull, install, new `.env` variables, migrate)                                                                                                                                                 |
| Environment     | `env init` · `env sync` (adds new variables, keeps yours) · `env secrets` · `env check [--production]` · `env keys`                                                                                                                                          |
| Local services  | `services up\|down\|restart\|status` (Compose) · `services observability` (metrics and logs)                                                                                                                                                                 |
| Database        | `db reset [--light\|--empty\|--profile <name>]` · `db migrate` · `db status` · `db new <name>` · `db generate` · `db seed` · `db bootstrap` · `db integrity` · `db studio` · `db psql` · `db backup` · `db restore <file>` · `db test-list` · `db test-drop` |
| Development     | `dev [admin\|it\|web]` · `build [--clean]` · `start [admin\|it\|web]` · `lint` · `types` · `format` · `clean` · `kill-ports`                                                                                                                                 |
| Tests           | `check` (everything CI's static job runs) · `test [unit\|checks]` · `test db` · `test e2e [playwright args]` · `test e2e:ui` · `test volume` · `test ci`                                                                                                     |
| Background work | `worker email\|revalidation\|maintenance\|all` · `worker check` · `cron` (runs the scheduled job once)                                                                                                                                                       |
| Deployment      | `deploy check` · `deploy prepare` (check, migrate, build) · `deploy migrate` · `deploy vercel <admin\|web\|all> [--prod]` · `deploy self`                                                                                                                    |
| Other           | `docs` (API reference) · `company list\|demo-assets` · `audit` · `urls`                                                                                                                                                                                      |

Each frontend application (`apps/admin`, `apps/it`, `apps/web`) is a strictly decoupled, independent npm application containing its own libraries, contracts, components, localized copy, scripts, and tests. They can be executed independently (e.g. `npm run dev`, `npm run type-check`, `npm test`, `npm run test:e2e`), or orchestrated centrally via the root `package.json` (`npm run test:admin`, `npm run check:admin`, etc.) and `./run.sh`.

## Guides

| Guide                                                            | Contents                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)               | Run the demo, load a company profile, or start blank with the setup wizard                           |
| [docs/backend/README.md](docs/backend/README.md)                 | Go microservices architecture, schema ownership, and event-driven design                             |
| [company/README.md](company/README.md)                           | Company profile format: identity, theme, fonts, brand files                                          |
| [docs/FEATURES.md](docs/FEATURES.md)                             | What each area of the admin, IT dashboard, and website does, and its rules                          |
| [docs/DATABASE.md](docs/DATABASE.md)                             | Start, seed, reset, migrate, back up and restore the database                                        |
| [docs/OPERATIONS.md](docs/OPERATIONS.md)                         | Environment variables, integrations, workers, domains, deployment and upgrades                       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                     | How the frontends, Go microservices, and theming fit together                                        |
| [docs/SECURITY.md](docs/SECURITY.md)                             | Authentication, MFA, authorization, customer accounts, online payments, data protection, retention   |
| [docs/LOCALIZATION.md](docs/LOCALIZATION.md)                     | Arabic and English copy rules                                                                        |
| [docs/TESTING.md](docs/TESTING.md)                               | Test layers, running and writing tests                                                               |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md)                   | Microservice OpenAPI contracts and application HTTP routes                                           |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, in three jobs:

- **static**: lint, types, action schemas, brand guard, unit tests and static checks
- **database**: seeded and bare Postgres, integrity rules, every business-rule check, profile bootstrap
- **e2e**: production builds of applications with Playwright (setup wizard, admin on desktop and phone, website, IT desk)

Failed runs upload reports, traces and screenshots as artifacts. `./run.sh test ci` runs the same three locally.

## License

[MIT](LICENSE).
