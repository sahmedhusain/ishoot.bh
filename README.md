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

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
pnpm dlx supabase start -x studio,postgres-meta,logflare,vector,supavisor,edge-runtime,realtime,imgproxy,mailpit
```

Fill in `.env` from `pnpm dlx supabase status`, plus `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. Then choose how to start:

| Start with | Command | Result |
|---|---|---|
| The demo company | `pnpm db:reset` | The fictional company in `company/profiles/demo`, with full demo data |
| Your own company profile | `pnpm db:reset --profile <name>` | Your brand on demo data (`COMPANY_PROFILE=<name> pnpm db:bootstrap` for a real installation) |
| A blank company | `pnpm db:reset:empty` | The admin opens the first-run setup wizard |

```bash
pnpm dev
```

Admin: http://localhost:3001 · Website: http://localhost:3000. [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) walks through each option, including how to create a company profile.

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
| `pnpm docs:api` | Regenerate the API reference from the code |

## Guides

| Guide | Contents |
|---|---|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Run the demo, load a company profile, or start blank with the setup wizard |
| [company/README.md](company/README.md) | Company profile format: identity, theme, fonts, brand files |
| [docs/DATABASE.md](docs/DATABASE.md) | Start, seed, reset, migrate and back up the database |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Environment variables, services, workers, deployment and upgrades |
| [docs/FEATURES.md](docs/FEATURES.md) | What each area of the admin does, and its rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system and the theming fit together; data model |
| [docs/SECURITY.md](docs/SECURITY.md) | Authentication, MFA, authorization, data protection, retention |
| [docs/LOCALIZATION.md](docs/LOCALIZATION.md) | Arabic and English copy rules |
| [docs/TESTING.md](docs/TESTING.md) | Test layers, running and writing tests |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Every route, server action and model (generated: `pnpm docs:api`) |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, in three jobs:
- **static**: lint, types, knip, action schemas, brand guard, unit tests and static checks
- **database**: seeded and bare Postgres, integrity rules, every business-rule check, profile bootstrap
- **e2e**: production builds of both apps with Playwright (setup wizard, admin on desktop and phone, website)

Failed runs upload reports, traces and screenshots as artifacts.
