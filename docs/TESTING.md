# Testing guide

Three layers, all of which run in GitHub Actions (`.github/workflows/ci.yml`) on every pull request and every push to `main`.

| Layer | Command | Needs | What it covers |
|---|---|---|---|
| Unit | `pnpm test:unit` | nothing | Theme engine, company profiles, activities and website presets, CMS blocks, sample content, departments and roles, products, inventory, purchasing, store pricing and orders, payment gateways (webhook verification, amounts), customer sign-in, delivery zones and slots, couriers, tasks, marketing, reports (periods, schedules, the Excel writer) |
| Static checks | `pnpm test:checks` | nothing | Brand neutrality, copy and language rules, permissions, payroll and approval engines, security boundaries, upload storage, navigation |
| Database checks | `pnpm test:checks:db` | two `_test` databases | About 35 suites of business rules on real Postgres (finance, payroll, GOSI, approvals, assets, handovers, archive, signatures, website…). Each rolls back its own records. |
| End-to-end | `pnpm test:e2e` | Postgres, Chromium | First-run setup wizard, admin sign-in and audit, branding, theme editing, departments, every sidebar page and link, phone layouts; products, stock, purchasing, orders, payments, delivery, fleet, courier agencies, tasks, customer service, marketing, PR, legal and reports; website pages in English and Arabic, customer accounts, cart and checkout, online payment, delivery tracking, 404 |

`pnpm test` runs the unit tests and static checks together, and needs no database. `./run.sh check` runs everything the CI static job runs (lint, types, tests, copy, brand, action schemas, knip); `./run.sh test db` prepares both databases and runs the database checks; `./run.sh test e2e [args]` prepares the e2e databases and runs Playwright; `./run.sh test ci` runs all three.

## Database checks

```bash
node tests/e2e/prepare-db.cjs bare platform_bare_test
```

```bash
SEED_VOLUME=on node tests/e2e/prepare-db.cjs seeded platform_seeded_test
```

```bash
CHECKS_BARE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/platform_bare_test CHECKS_SEEDED_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/platform_seeded_test pnpm test:checks:db
```

Some checks count rows or expect a company that is not set up yet, so they need the **bare** database. The others need demo data. A suite only runs when its database name ends in `_test`.

## End-to-end (Playwright)

```bash
pnpm exec playwright install chromium
```

```bash
pnpm test:e2e
```

`test:e2e` rebuilds `platform_e2e_test` (seeded, demo profile) and `platform_e2e_blank_test` (blank install), then starts three servers through `tests/e2e/serve.cjs`, each on its own database and build folder:

| Port | Server | Projects |
|---|---|---|
| 3101 | Admin on the seeded database | `admin-login`, `admin`, `admin-mobile` |
| 3102 | Website on the seeded database | `web`, `web-mobile` |
| 3103 | Admin on the blank database | `setup-wizard` |
| 3199 | A local Stripe stand-in, started by the payment specs | (the servers get `PAYMENT_GATEWAY_BASE_URL_STRIPE` and `CRON_SECRET=e2e-cron-secret`) |

Disposable accounts for these runs (administrator, viewer, driver) are in `tests/e2e/fixtures/users.json`; they exist only in the test databases.

Useful variations:

```bash
pnpm exec playwright test --project=web
```

```bash
pnpm exec playwright test --ui
```

`pnpm exec playwright test` reuses the prepared databases (`E2E_SEEDED_DATABASE` and `E2E_BLANK_DATABASE` choose other `_test` databases). Run `pnpm test:e2e:prepare` again after the setup-wizard test, because that test completes the blank company's setup. `E2E_SERVER_MODE=start` serves production builds, as CI does; build them first with `NEXT_DIST_DIR=.next-e2e`. Reports, traces, videos and screenshots go to `tests/.results/`.

`specs/admin/links.spec.ts` and `specs/web/links.spec.ts` crawl every page (`tests/e2e/crawl.ts`): error statuses,
broken images and downloads, new-tab links without `rel="noreferrer"`, links into the other language, and who may
open each attachment. They take several minutes; run them with `--project=admin` or `--project=web` and a spec path.

Tests read their expectations from the repository instead of hardcoding them: the demo company and theme come from `company/profiles/demo`, and labels come from the admin's Arabic locale file.

## Writing tests

- Business rules on data go in a `scripts/check-*.cjs` script (plain `node:assert`, rolled back in a transaction) listed in `tests/checks/database.test.ts`, or in `static.test.ts` if no database is needed.
- Pure functions go in `tests/unit/*.test.ts` (Vitest).
- User journeys go in `tests/e2e/specs/<project>/*.spec.ts`. Use the helpers in `tests/e2e/helpers.ts` (`watchErrors`, `brokenImages`, `visibleContent`, `themeVariable`, `testDatabase`).
- The admin tests share one sign-in (`tests/e2e/auth/admin.setup.ts`), because the login rate limit is enforced.

## Volume

```bash
pnpm test:volume
```

Rebuilds `platform_volume_test` from the demo seed, adds 2,000 employees (1,500 with accounts) in a nested
department tree and 50,000 requests, deals and expenses, then times the people and record lists (users, employees,
directory, org chart, data scopes, deals, expenses, request inbox) against a 1.5-second budget each. The database
keeps the volume, so `node tests/e2e/serve.cjs admin 3023 platform_volume_test` opens it in the browser.

## Manual diagnostics

These need running servers and are not part of CI:

| Script | Purpose |
|---|---|
| `node scripts/check-website-http.cjs` | Website HTTP behaviour against a preview server on a `_test` database (fixtures: `node company/seed/website-preview.cjs`) |
| `pnpm test:followup-http` | Admin HTTP follow-up checks against a running server |
| `node scripts/profile-local-http.cjs` | Local response-time baseline (not a production benchmark) |
| `node scripts/test-heavy-load-and-optimizations.cjs` | Stress and edge-case scenarios on a `_test` database |
