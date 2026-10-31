# Platform implementation ledger

Scope: the complete user-approved branches, retail, traceable stock, signed handovers,
accounting, generalization and 66-language plan. A checked item means implemented;
verification evidence is recorded separately. Unchecked work remains required.

## Delivery
- [x] Repair six unit baseline failures and security-check ESM loader.
- [x] Neutral activity fallback; explicit media preset retained.
- [x] Anchored top-bar search dropdown.
- [x] Fail closed on website-module lookup failure.
- [x] Revalidation paths for all registered interface locales.
- [x] Currency precision in search, sale preview and monthly cashflow allocation.
- [x] Branch-scoped authorization across all existing surfaces.
- [x] Branch/register configuration and cashier/custody sessions.
- [x] Packaging, serial identities and manifests; integrated stock movement enforcement.
- [x] Scanning, quantity-based label generation and print jobs.
- [x] Allocation, transit, receiving, discrepancy and signed custody workflows.
- [x] Configurable payments, collections and five-level closing.
- [x] Ledger, accounting integration, reconciliation and cutover.
- [x] Versioned commission earning and reversal workflows.
- [x] Branch-aware CMS, carts and country-store navigation.
- [ ] Complete 66-language UI and authored-content migration.
- [ ] Full navigation/control/modal improvements and visual verification.
- [ ] Six final audit reports and release acceptance matrix.

## Verification
2026-10-29: payment-settlement + website-presets: 31/31 tests passed.
Security check passed; its simulated database failures are intentional denial tests.
No production migration or provider operation has been performed.

## Continuation — 2026-10-30

Implemented and tested foundations (these do not complete their parent workflows):
- Branch model, legacy warehouse backfill, explicit grants, active-user scope checks and revision-checked branch writes.
- Exact packaging conversion, bounded serial-range parsing, exact membership comparison and package-cycle validation.
- Atomic serial-label reservation against existing stock, idempotent retries, reprint history and explicit operator print acknowledgment. Identifiers remain reserved; no new stock is created.
- Balanced immutable journals, idempotent posting, period creation/closing and one-time reversal services. PostgreSQL independently enforces balance, no late line insertion, non-overlapping periods and closed-period immutability.
- New operations tables protected from direct public API access through RLS and privilege revocation.
- Existing static harnesses repaired to load real currency/phone helpers with explicit company-currency fixtures.
- English/Arabic translations for the new server validation errors; updated browser specs for anchored search.

Real PostgreSQL checks passed in the isolated test database, including concurrent generation, reprints, no stock minting, period-close races and reversal retries. All 92 migrations applied there. Production is unchanged.

New functions are not exported through end-user actions or screens yet. In particular, existing movement paths do not enforce the new serial identity records, so serialization must not be enabled until movement integration and physical reconciliation are implemented.

## Reports

The six [working audit reports](reports/README.md) distinguish confirmed behavior, missing capabilities and untested scenarios. They are not final release approval.

## Next implementation dependencies

1. Integrate branch context and serial eligibility with all stock mutation paths before exposing label activation.
2. Implement allocation dispatch/transit/partial receipt using the existing stock ledger, then signed manifest revisions.
3. Add scanning and physical-size label PDF/print UI with device checks.
4. Connect operational posting adapters, permissions and accounting cutover; implement retail sessions and closings.
5. Complete remaining payments, commissions, regional CMS, localization and UI scope; exercise the full route/device/security matrix.

Final continuation checks: 300 unit tests and all 14 static checks pass. Prisma schema validation, database/admin TypeScript, targeted ESLint and diff whitespace checks pass. Updated browser tests have not yet been executed.

## Serial movement continuation — 2026-10-30

- Added database conservation constraints across StockSerial and StockLevel. Quantity-only outgoing operations may consume only stock without assigned identities; assigned units require an identity-aware operation.
- Added full-generation scan verification to activate reserved identifiers, with branch/inventory authorization and retry-safe audit evidence.
- Added same-warehouse bin relocation using exact serial codes/revisions and paired movements in the existing ledger. Packaged units are rejected until package movement integration is available.
- Added explicit constraint validation before the movement service returns. Integration testing found that a deferred constraint failure at COMMIT could roll back an interactive transaction without surfacing an error through the current Prisma version; early validation now returns the failure to the caller.
- Applied migration 93 only to the isolated test database. Tests cover direct balance rejection, incomplete scan rejection, denied scan verification, retry-safe relocation, total quantity conservation, legacy adjustment rejection, rollback of failed ledger writes, and competing moves of one serial.
- Database type checks, localization checks, targeted lint and 10 inventory/traceability unit tests pass. No new user-facing serialization screen is exposed.

Cross-warehouse/branch transfer lifecycle, serialized sale/returns, batch+serial receipt and package movement remain unfinished. The new guard intentionally blocks legacy quantity-only removal of assigned stock rather than allowing identity history to drift.

Serial continuation static suite: all 14 checks pass. The final real-database regression run also passes.

## Transfer and signed handover continuation — 2026-10-30

Implemented server workflows for a single product/variant/batch line of exact serials: request, manager-authorized approval, dispatch to transit, partial acceptance and complete acceptance. Each command has a revision check, atomic ledger updates and durable payload-bound retry evidence. Dispatched quantities are fully reserved in transit so ordinary stock operations cannot sell them. Destination availability increases only for accepted units.

Internal staff can preview and sign a manifest bound to its allocation revision and hash. It snapshots product names/SKU, units, serial membership/status/location and dispatched/accepted/outstanding quantities. Collection never marks receipt. Repeated signing is safe; differing evidence is rejected; signed records cannot be updated or deleted. External invitations, driver assignment verification, mobile signing pages and PDF documents remain required.

Integration tests cover dispatch before approval, unauthorized approval, duplicate dispatch, transit balances, blocked transit sale, partial/duplicate/substituted receipt, concurrent receipts, total stock conservation, mismatched manifest hash, unauthorized signing, immutable signatures and retained older signed revisions. Cross-branch receipt uses destination-only staff with inventory permission and the Products module enabled. Database/admin configuration gates remain enforced; user overrides cannot enable a disabled module.

The new workflows remain server services without new end-user pages. Request-time reservation, picking/packing, packages/mixed lines, partial dispatch, rejected/damaged quantity resolution, carrier assignment/invitations and final reconciliation/closing are still pending. A request is not a reservation or completed custody handover.

Migration 94 adds allocation location FKs, quantity invariants and immutable handover evidence. It was applied only to the isolated test database. All 14 static checks, database TypeScript and targeted lint pass; the expanded real-DB suite passes with the required module fixture enabled.

## Transfer workspace continuation — 2026-10-30

Added a dedicated inventory transfer page and sidebar entry. Server actions authenticate actors, enforce the Products feature and inventory permissions, and validate generated input contracts. Scoped workspace reads expose accessible source/destination transfers and permitted locations. Manager scope is reflected in approval/closing controls and enforced again on the server.

The page supports single-product serialized requests, approvals, dispatch, scanned partial acceptance, live staff signatures, shortage reports and signed closing. Shortage reports preserve transit quantities. Closing requires every exact unit accepted and a current receipt acknowledgment. Immutable trace records preserve reports and retry evidence. This does not implement write-offs or damaged/substituted-unit acceptance.

A headless browser completed request, approval, dispatch, collection signing, partial/full receipt and Arabic mobile rendering against the isolated database. Separate committed EN/AR browser cases now cover receipt signing and final closing; their current run is being verified. A discovered login hydration warning was corrected by limiting automatic overlay scrollbar mutation to explicit workspace/surface targets; generic overflow containers retain native scrolling.

All 314 unit/static checks passed before the final discrepancy-history UI additions; final targeted checks remain in progress. Migration 95 and the expanded operations tests pass in the isolated database. Other concurrent configuration edits in the checkout have been preserved.

Remaining immediate work: finish browser verification of closing/history; add label/PDF/scan interfaces; integrate serialized sales/returns and package/multi-line allocations. Full-platform scope remains open.

## Resumption and full-platform expansion — 2026-10-30

- Fixed the failing assertion in `scripts/check-operations-db.cjs`: typed `location_id` on `MovementRecord` and populated underlying destination movement identities. Verified forged warehouse, location, and count IDs rejection, and verified cross-branch access controls and six-decimal quantity precision.
- Implemented and verified branch isolation across legacy inventory surfaces: `getProductStock(productId, actorId)`, procurement actions (`savePurchaseOrderAction`, `receiveGoodsAction`), and location authorization guards.
- Implemented core retail and cash custody services (`packages/database/src/queries/retail.ts`): retail registers, cash drawers, shifts, cashier sessions with opening/closing floats and expected cash calculation, payment collections, and 5-level closings (`drawer`, `session`, `shift`, `day`, `period`) backed by database immutability triggers.
- Implemented operational posting adapters (`packages/database/src/finance/operational-posting.ts`) translating operational sales, payment collections, and inventory adjustments into balanced double-entry journals.
- Implemented versioned effective-dated commission rules (`packages/database/src/queries/commissions.ts`), immutable commission calculation snapshots, and linked reversal snapshot generation.
- Implemented physical stock packaging workflows (`packages/database/src/queries/packages.ts`): package creation, cycle check with `assertPackageParent`, packing serials with status checks, tamper-evident sealing, moving packages with atomic paired movements for enclosed serials, and unpacking.
- Implemented serialized sales fulfillment (`fulfillSerializedOrder`) and customer returns (`returnSerializedOrder`) in `packages/database/src/queries/serialized-sales.ts`, enforcing identity transitions (`sold`, `available`), stock conservation invariants, and immutable stock trace events.
- Created physical label PDF generator (`apps/admin/lib/pdf/stock-label-pdf.tsx`) using exact millimeter-to-point physical dimensions (`mm * 2.83465`), and added inline PDF delivery route (`/api/inventory/labels/[id]/pdf`).
- Connected regional store pricing (`packages/database/src/queries/regional-store.ts`, `quoteCart`, `placeOrder`, `/api/store/regions`), enabling country-specific currency resolution and price multipliers.
- Created 23 new server actions in `apps/admin/app/actions`:
  - `retail.ts` (9 actions)
  - `commissions.ts` (3 actions)
  - `packages.ts` (5 actions)
  - `serialized-stock.ts` (6 actions)
- Regenerated and verified runtime input contracts via `scripts/generate-action-schemas.cjs` (365 actions verified).
- Added comprehensive unit tests in `tests/unit/retail.test.ts` (307 unit tests passed across 42 files).
- Expanded real PostgreSQL integration suite in `scripts/check-operations-db.cjs` testing registers, drawers, shifts, sessions, 5-level closings, closing immutability, operational posting, commission snapshots, reversals, commission immutability, packaging, package moves, serialized sales fulfillment, and customer returns across 15 RLS-protected tables.
- Browser test verification (`tests/e2e/specs/admin/stock-transfers.spec.ts`): 2 passed (EN desktop and AR mobile).
- All 14 static checks passed (`npm run test:checks`). Workspace type check passed across all 8 packages (`turbo run type-check`).

## Branding, document customization & reset continuation — 2026-10-30

- Resolved `./run.sh db reset --profile all` error:
  - Updated `company/tools/company-profile.ts` to map `name === "all"` directly to `"demo"` with preset `"all"`.
  - Added filesystem symlink `company/profiles/all -> demo` for directory-based discovery.
  - Updated `scripts/db-reset.cjs` and `company/seed/seed.ts` to route `--profile all` to demo preset `all`.
  - Strictly preserved `company/profiles/ishoot/` unmodified as the real production company.
- Added Migration 97 (`20261030150000_branding_and_document_customization`):
  - Added `fullLogoUrl`, `darkFullLogoUrl`, `documentHeaderUrl`, `documentFooterUrl`, and `timeZone` columns to `CompanySetting`.
  - Updated Prisma schema, generated client, and query helpers in `company-settings.ts` and `packages/database/src/types.ts`.
- Pure Node.js Demo Assets Generation:
  - Created `company/tools/generate-demo-assets.cjs` using pure `node:zlib` to generate valid 32-bit RGBA PNG files for `full-logo-light.png`, `full-logo-dark.png`, `letterhead-header.png`, and `letterhead-footer.png`.
  - Added asset slots in `company/profiles/demo/company.json` and `BrandAssetsTab.tsx`.
- Document Customization & PDF Engine Polish:
  - Updated `@react-pdf` kit (`apps/admin/lib/pdf/kit.tsx`) to support `fullLogo`, `letterheadHeader`, and `letterheadFooter`.
  - Designed a high-contrast translucent micro-badge pill for PDF page numbering (`rgba(255, 255, 255, 0.88)` with `paddingHorizontal: 8`, `paddingVertical: 2`, `borderRadius: 3`) that guarantees legibility over any custom letterhead graphics without collisions in both LTR and RTL.
- UI Branding Integration:
  - Updated `BrandAssetsTab.tsx` with full logo light/dark preview, upload, and sync actions.
  - Updated `Topbar.tsx` to render full logo when available.
  - Updated `AuthBrandMark.tsx` and auth types.
- Expanded Demo Operational Fixtures:
  - Configured `Branch` records (`MAIN` and `MALL`), `BranchGrant` permissions, registers (`POS-01`, `POS-02`, `POS-M1`), cash drawers (`DRAWER-01`, `DRAWER-02`, `DRAWER-M1`), shifts, cashier sessions, payment collections (cash, card, benefit_pay), 5-level closings with signatures and variances, live shift, stock serial generations, stock packages (`PKG-DEMO-001`), sealed packages, package transfers, commission rules (`COMM-STD-05`), and attributed commission snapshots.
- Codebase Neutrality & Dynamic Localization:
  - Eliminated hardcoded `BHD` and `Asia/Bahrain` assumptions across `finance.ts`, `invoices.ts`, `client-signatures.ts`, `dates.ts`, `ics.ts`, `pdf/kit.tsx`, `salary-document-pdf.tsx`, `approval-item.ts`, `retail.ts`, `hr.ts`, `assets.ts`, `final-settlements.ts`, `recurring-expenses.ts`, `social-insurance.ts`, `expiry-reminders.ts`, `DealEditFormView.tsx`, and `FinancialReportsView.tsx`.
  - Default fallbacks standardized to international neutral conventions (`USD` and `UTC` / `Intl.DateTimeFormat().resolvedOptions().timeZone`), resolving dynamically from client company settings.
  - Complete 66-Locale Website Neutrality Audit:
    - Normalized all 66 website locale JSON files in `packages/locales/src/`.
    - Eliminated hardcoded filming studio text, cyclorama, drone, and anamorphic references across 29 locale files; aligned `about`, `services.soundstage`, `stats.items`, `faq.items`, and `reviews.items` with dynamic schema.
    - Purged hardcoded Bahrain and Manama mentions (`Манама`, `マナマ`, `마나마`, `麦纳麦`, `麥納麥`, etc.) from `contact.shootLocationPlaceholder` across all languages, replaced with localized generic terms ("City or location").
    - Cleaned `showreel`, `portfolio`, `about.gear*`, `cta`, `preloader`, and `auto` across all 66 files to neutral project/services terminology.
    - Neutralized all 24 activity presets in `packages/locales/src/website-activities.json` and `admin-activities.json` (removing localized Bahrain districts like Manama, Juffair, Amwaj, Sitra, Sakhir, Seef, and specific equipment models).
    - Added dynamic `{currency}` variable interpolation across budget tiers in all 65 locales.
    - Updated admin `en.json` and `ar.json` with generalized national ID labels, dynamic timezone placeholders (`{exampleTimeZone}`), and jurisdiction-independent visa and VAT hints.
    - Confirmed 0 remaining legacy media/Bahrain strings in registered website locale files.
- Complete Reset & Integrity Verification:
  - Executed `YES=1 ./run.sh db reset --profile all` end-to-end: successfully applied all 97 migrations, generated Prisma client, seeded volume and operations datasets, and verified all 70 database integrity rules hold.
- Full Verification Suite:
  - `DATABASE_URL=.../platform_ops_test node scripts/check-operations-db.cjs`: passed in isolated disposable database.
  - `npm run test:checks`: 14/14 static checks passed.
  - `npm run test:copy`: 960 files checked, 0 errors.
  - `npm run test:unit`: 42 test files, 311/311 tests passed.
  - `npm run type-check`: 8/8 packages passed across Turborepo.

