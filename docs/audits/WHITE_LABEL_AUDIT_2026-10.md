# White-label, design and test audit — October 2026

Branch: `feat/white-label-and-test-suite`. Goal: any company can install the admin and website, brand them on first run, and every business rule is covered by automated tests that run on GitHub.

## 1. Branding is hardcoded into both apps

| Where | What | Count |
|---|---|---|
| Package scope | `@ishoot/*` imports across apps, packages, scripts | ~1,000 lines |
| CSS tokens | `--ishoot-*` variables with fixed hex values in `apps/admin/app/globals.css`, `apps/web/app/globals.css` | 53 lines |
| Tailwind preset | `packages/config/tailwind.config.ts` fixes `primary`, `accent`, `bg`, `text` colours and Thmanyah fonts | 1 file |
| Component colours | Raw hex in `.tsx` (`text-[#9EADA9]`, `bg-[#014842]`, …) | ~460 values in ~90 files |
| Fonts | 17 Thmanyah font files copied into **both** `apps/*/public/fonts` and declared via `@font-face` in both `globals.css` | 34 files |
| Brand images | Logos, stamp, a named CEO signature, banners, duplicated across `apps/admin/public/{brand,branding,images}`, `apps/web/public/{brand,branding,images,banners}`, `packages/config/src/assets/brand` | ~60 files, 17 MB |
| Company identity | `initial-company-config.json` exists twice (`packages/database/src` and `prisma/`, identical) with real CR, VAT, IBAN, phone, social links | 2 files |
| Demo data | `prisma/seed.ts` (3.8k lines), `seed-volume.ts`, `scripts/seed-*.cjs` use ishoot names, `@ishoot.bh` emails, Bahrain addresses | ~4.7k lines |
| Identifiers | `ishoot_preview` cookie, `.env.example` defaults (`admin@ishoot.bh`, `ishoot_db`), docker-compose defaults, CI DB name | ~15 places |
| Copy | Product strings mentioning the company in components and actions (e.g. `CEOHero`, PDF kit, notifications) | ~200 lines outside the scope rename |

## 2. There is no first-run setup

`CompanySetting` stores names, logos, stamp and signature, but **no colours, fonts or theme**. `db:bootstrap` writes the ishoot config by default. A new company gets ishoot's identity until someone edits settings, and it can never change the colours or fonts at all.

## 3. Design consistency (new pages)

Reviewed live (admin in Arabic, dark, desktop and 375 px; website in English, light): dashboard, archive, assets, settings, website home.

- The shared shell, cards, stat tiles, filter chips and tables are consistent across the new archive and assets pages. RTL is correct, and the mobile layout stacks cleanly.
- Primary actions wrap onto two lines at desktop width (`إضافة أصل` on assets), and table headers wrap (`يتطلب توقيع` on archive). Buttons need `whitespace-nowrap`.
- Archive rows mix a reference code into the title line (`نموذج التسليم A HO-2026-000001`). The reference should sit on its own muted line, as it does on assets.
- `/dashboard/hr` has no index page and returns 404. Any link or bookmark to it dead-ends. It needs a redirect to the first HR sub-page.
- Because colours are raw hex rather than tokens, light/dark and any future brand colour cannot be applied consistently. This is the main design debt.

## 4. Logic and test coverage

- **No test runner.** About 60 `scripts/check-*.cjs` scripts (9.6k lines of real `node:assert` checks) cover payroll, GOSI, approvals, finance, FX, leave, handovers, archive, assets, signatures and more.
- **CI runs only about 10 of them.** These are never run anywhere: `check-admin-navigation`, `check-admin-plan`, `check-communications-db`, `check-communications-pdf`, `check-profile-security-db`, `check-website-http`. Most `*-db` checks are wired to `package.json` but not to CI.
- **CI is red on `main` today.** `pnpm audit:unused` (knip) reports 24 unused exports, 3 unused types and 7 unlisted dependencies (`sharp`, `bcryptjs` used by scripts).
- There are no end-to-end tests for either app and no first-run journey test.

## 5. Leftovers

Tracked in git (to be removed):
- `.idea/*` (6 files, despite being in `.gitignore`)
- `docs/admin-dashboard-plan/{inventory,verification,dashboard-query-check}.json` (generated dumps)
- One-off scripts referenced nowhere: `scripts/repair-demo-files.cjs`, `scripts/seed-new-features.cjs`, `scripts/test-heavy-load-and-optimizations.cjs`, `scripts/profile-local-http.cjs`, `scripts/generate-signatures.cjs` (to be confirmed per file before deletion)
- Duplicate brand folders in `apps/*/public` (`brand/`, `branding/`, `images/`) and duplicate `initial-company-config.json`

Local, ignored (kept for now at the owner's request): `graphify-out/`, `.agents/`, `.idea/`, `scratch/`. `ishoot/` moves into the company example folder.

## 6. Plan

| Phase | Outcome |
|---|---|
| 2. Package scope | `@ishoot/*` → `@platform/*` everywhere, with lockfile regenerated |
| 3. Root `company/` folder | `company/<profile>/{assets,config,seed}`, selected by `COMPANY_PROFILE`; apps and packages contain no brand files; a guard script fails CI on brand strings or assets inside `apps/` or `packages/` |
| 4. Theming | `CompanySetting` gains a theme (colours, fonts, radius, default mode); `--brand-*` CSS variables rendered from settings in both apps; raw hex replaced with token classes |
| 5. Setup wizard | Shown when the company is not set up: identity → brand colours and fonts with live preview and contrast check → asset uploads → configuration (currency, VAT, numbering, locale, modules) → first admin |
| 6. Tests | Vitest unit tests for the pure engines; every `check-*.cjs` run as a test case; Playwright E2E for setup, login, navigation smoke and key flows in both apps |
| 7. CI | Parallel jobs: static (lint, types, knip, brand guard), unit, DB integration, E2E admin, E2E web; reports and traces kept as artifacts |
| 8. Cleanup | Remove the tracked leftovers above; fix the design issues in §3 |
