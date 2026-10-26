# Business platform

A complete business system and a bilingual public website, both in Arabic and English, that any company can install and brand as its own. Nothing about a specific company lives in the code: each installation sets its name, activity, colours, fonts, logos and configuration in a first-run setup wizard, or from a profile in [`company/`](company/README.md).

**The admin system** covers CRM and deals, quotations, invoices and payments, expenses and claims, HR and payroll, assets, approvals, documents and letters, calendar and announcements; products, stock and purchasing; an online store with customer accounts, online payments (seven gateways) and delivery (zones, time slots, own fleet with a driver's phone view, courier agencies); tasks and projects, customer service, marketing campaigns and broadcasts, public relations and legal matters; and a report catalogue with CSV, Excel and PDF exports and scheduled e-mail. Optional areas are modules a company switches on.

**The website** is built from the admin: pages made of blocks, menus, articles, a catalogue (works, products, listings or case studies, by activity), a cart and checkout, customer accounts, delivery tracking and a press page.

It suits 23 kinds of company out of the box (media, agencies, retail and online stores, restaurants, clinics, real estate, construction, education, logistics, law firms, IT and more), each with its own wording, website, modules, pipeline stages, departments and sample content.

## Repository

```
apps/
  admin/        Next.js admin system (port 3001)
  web/          Next.js public website, store and customer accounts (port 3000)
packages/
  database/     Prisma schema, migrations, queries, domain services, payment and courier adapters, theme engine
  ui/           Shared React components
  locales/      Arabic and English copy
  email/        Email delivery and templates
  config/       Tailwind preset (reads the company theme), currency and shared constants
company/
  profiles/     One folder per company: identity, theme, logos, fonts, media (demo = neutral example)
  seed/         Demo business data
  tools/        Installs a profile into the database and file storage
scripts/        Check suites, workers, bootstrap, reset and the .env tool
tests/          Unit tests, check runners and Playwright end-to-end tests
docs/           Guides
run.sh          One entry point for setup, services, databases, development, tests and deployment
```

## Quick start

Prerequisites: Node 22 or newer, pnpm 12 and Docker.

```bash
./run.sh setup
```

This installs dependencies, creates `.env` from [`.env.example`](.env.example) with generated secrets, starts the local Supabase stack (Postgres and storage) and builds the demo database. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env` (and the `service_role` key from `./run.sh services status`) when it asks, then:

```bash
./run.sh dev
```

Admin: http://localhost:3001 · Website: http://localhost:3000.

| Start with | Command | Result |
|---|---|---|
| The demo company | `./run.sh db reset` | The fictional company in `company/profiles/demo`, with full demo data (`--light` for less) |
| Your own company profile | `./run.sh db reset --profile <name>` | Your brand on demo data (`./run.sh db bootstrap --profile <name>` for a real installation) |
| A blank company | `./run.sh db reset --empty` | The admin opens the first-run setup wizard |

[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) walks through each option, including how to create a company profile. `./run.sh doctor` checks your tools, `.env`, database and ports.

## `run.sh`

`./run.sh help` lists everything. The main commands:

| Area | Commands |
|---|---|
| Getting started | `setup [--light\|--empty]` · `doctor` · `install` · `upgrade` (pull, install, new `.env` variables, migrate) |
| Environment | `env init` · `env sync` (adds new variables, keeps yours) · `env secrets` · `env check [--production]` · `env keys` |
| Local services | `services up\|down\|restart\|status` (Supabase) · `services docker [up\|down\|logs]` (plain Postgres and pgAdmin) |
| Database | `db reset [--light\|--empty\|--profile <name>]` · `db migrate` · `db status` · `db new <name>` · `db generate` · `db seed` · `db bootstrap` · `db integrity` · `db studio` · `db psql` · `db backup` · `db restore <file>` · `db test-list` · `db test-drop` |
| Development | `dev [admin\|web]` · `build [--clean]` · `start [admin\|web]` · `lint` · `types` · `format` · `clean` · `kill-ports` |
| Tests | `check` (everything CI's static job runs) · `test [unit\|checks]` · `test db` · `test e2e [playwright args]` · `test e2e:ui` · `test volume` · `test ci` |
| Background work | `worker email\|revalidation\|maintenance\|all` · `worker check` · `cron` (runs the scheduled job once) |
| Deployment | `deploy check` · `deploy prepare` (check, migrate, build) · `deploy migrate` · `deploy vercel <admin\|web\|all> [--prod]` · `deploy self` |
| Other | `docs` (API reference) · `company list\|demo-assets` · `audit` · `urls` |

Every command prints the `pnpm` script it runs; the scripts in `package.json` work on their own too.

## Guides

| Guide | Contents |
|---|---|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Run the demo, load a company profile, or start blank with the setup wizard |
| [company/README.md](company/README.md) | Company profile format: identity, theme, fonts, brand files |
| [docs/FEATURES.md](docs/FEATURES.md) | What each area of the admin and the website does, and its rules |
| [docs/DATABASE.md](docs/DATABASE.md) | Start, seed, reset, migrate, back up and restore the database |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Environment variables, integrations, workers and the scheduled job, domains, deployment and upgrades |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system and the theming fit together; data model |
| [docs/SECURITY.md](docs/SECURITY.md) | Authentication, MFA, authorization, customer accounts, online payments, data protection, retention |
| [docs/LOCALIZATION.md](docs/LOCALIZATION.md) | Arabic and English copy rules |
| [docs/TESTING.md](docs/TESTING.md) | Test layers, running and writing tests |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Every route, server action and model (generated: `./run.sh docs`) |
| [docs/plans/PLATFORM_V2_PLAN.md](docs/plans/PLATFORM_V2_PLAN.md) | The v2 plan and its progress log |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, in three jobs:
- **static**: lint, types, knip, action schemas, brand guard, unit tests and static checks
- **database**: seeded and bare Postgres, integrity rules, every business-rule check, profile bootstrap
- **e2e**: production builds of both apps with Playwright (setup wizard, admin on desktop and phone, website)

Failed runs upload reports, traces and screenshots as artifacts. `./run.sh test ci` runs the same three locally.

## License

[MIT](LICENSE).
