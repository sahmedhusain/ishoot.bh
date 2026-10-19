# Business platform

An admin system (CRM, sales, finance, HR and payroll, assets, approvals, documents) and a bilingual public website, both in Arabic and English, that any company can install and brand as its own. Nothing about a specific company lives in the code: each installation sets its name, colours, fonts, logos and configuration in a first-run setup wizard, or from a profile in [`company/`](company/README.md).

## Repository

```
apps/
  admin/        Next.js admin system and CRM (port 3001)
  web/          Next.js public website, Arabic and English (port 3000)
packages/
  database/     Prisma schema, migrations, queries, domain services, theme engine
  ui/           Shared React components
  locales/      Arabic and English copy
  email/        Email delivery and templates
  config/       Tailwind preset (reads the company theme), currency and shared constants
company/
  profiles/     One folder per company: identity, theme, logos, fonts, media (demo = neutral example)
  seed/         Demo business data
  tools/        Installs a profile into the database and file storage
scripts/        Check suites, workers, bootstrap and reset
tests/          Unit tests, check runners and Playwright end-to-end tests
docs/           Guides
```

## Quick start

Prerequisites: Node 22+, pnpm 12, and Docker (for the local Supabase stack).

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
pnpm dlx supabase start -x studio,postgres-meta,logflare,vector,supavisor,edge-runtime,realtime,imgproxy,mailpit
```

Copy the URLs and service-role key from `pnpm dlx supabase status` into `.env`, and set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (see [docs/DATABASE.md](docs/DATABASE.md)). Then run:

```bash
pnpm db:reset
```

```bash
pnpm dev
```

Sign in at http://localhost:3001; the website is at http://localhost:3000. To see what a brand-new customer gets, run `pnpm db:reset:empty`: the admin then opens the setup wizard.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` / `dev:admin` / `dev:web` | Run the apps |
| `pnpm build` | Production build of both apps |
| `pnpm db:reset` (`:light`, `:empty`) | Fresh local database and files, seeded (local only) |
| `pnpm db:seed` / `db:bootstrap` | Demo data into an empty database / real installation setup |
| `pnpm db:migrate` / `db:migrate:new` / `db:status` | Apply, create and inspect migrations |
| `pnpm db:check-integrity` | Audit data against the business rules |
| `pnpm db:studio` | Browse the database |
| `pnpm lint` / `type-check` | Static analysis |
| `pnpm test` | Unit tests and static checks (no database) |
| `pnpm test:checks:db` | Business-rule checks on disposable databases |
| `pnpm test:e2e` | Playwright end-to-end tests for both apps |
| `pnpm test:brand` | Fails if any company's name, colours, fonts or files appear outside `company/` |
| `pnpm audit:unused` | Unused files, exports and dependencies (knip) |
| `pnpm company:demo-assets` | Regenerate the demo company's artwork |

## Guides

| Guide | Contents |
|---|---|
| [docs/DATABASE.md](docs/DATABASE.md) | Start, seed, reset, migrate and back up the database |
| [company/README.md](company/README.md) | Company profiles, themes, fonts and brand files |
| [docs/TESTING.md](docs/TESTING.md) | Test layers, running them locally, writing new tests |
| [docs/DEVOPS.md](docs/DEVOPS.md) | Environment variables, local services, email testing |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system fits together |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | HTTP APIs, server actions and data model |
| [docs/HRMS.md](docs/HRMS.md), [docs/SERVICES.md](docs/SERVICES.md), [docs/DATA_MODELS.md](docs/DATA_MODELS.md) | Domain guides |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, in three jobs:
- **static**: lint, types, knip, action schemas, brand guard, unit tests and static checks
- **database**: seeded and bare Postgres, integrity rules, every business-rule check, profile bootstrap
- **e2e**: production builds of both apps with Playwright (setup wizard, admin on desktop and phone, website)

Failed runs upload reports, traces and screenshots as artifacts.
