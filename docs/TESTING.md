# Testing guide

Three layers, all of which run in GitHub Actions (`.github/workflows/ci.yml`) on every pull request and every push to `main`.

| Layer | Command | Needs | What it covers |
|---|---|---|---|
| Unit | `pnpm test:unit` | nothing | Theme engine (normalisation, CSS injection safety, WCAG contrast, generated CSS, fonts), validity of every company profile |
| Static checks | `pnpm test:checks` | nothing | Brand neutrality, copy and language rules, permissions, payroll and approval engines, security boundaries, upload storage, navigation |
| Database checks | `pnpm test:checks:db` | two `_test` databases | About 35 suites of business rules on real Postgres (finance, payroll, GOSI, approvals, assets, handovers, archive, signatures, website…). Each rolls back its own records. |
| End-to-end | `pnpm test:e2e` | Postgres, Chromium | First-run setup wizard, admin sign-in and audit, branding, theme editing, every sidebar page, phone layouts, website pages in English and Arabic, 404 |

`pnpm test` runs the unit tests and static checks together, and needs no database.

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

Useful variations:

```bash
pnpm exec playwright test --project=web
```

```bash
pnpm exec playwright test --ui
```

`pnpm exec playwright test` reuses the prepared databases. Run `pnpm test:e2e:prepare` again after the setup-wizard test, because that test completes the blank company's setup. `E2E_SERVER_MODE=start` serves production builds, as CI does; build them first with `NEXT_DIST_DIR=.next-e2e`. Reports, traces, videos and screenshots go to `tests/.results/`.

Tests read their expectations from the repository instead of hardcoding them: the demo company and theme come from `company/profiles/demo`, and labels come from the admin's Arabic locale file.

## Writing tests

- Business rules on data go in a `scripts/check-*.cjs` script (plain `node:assert`, rolled back in a transaction) listed in `tests/checks/database.test.ts`, or in `static.test.ts` if no database is needed.
- Pure functions go in `tests/unit/*.test.ts` (Vitest).
- User journeys go in `tests/e2e/specs/<project>/*.spec.ts`. Use the helpers in `tests/e2e/helpers.ts` (`watchErrors`, `brokenImages`, `visibleContent`, `themeVariable`, `testDatabase`).
- The admin tests share one sign-in (`tests/e2e/auth/admin.setup.ts`), because the login rate limit is enforced.
