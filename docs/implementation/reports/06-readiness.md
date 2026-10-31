# Configuration, migration and operational readiness — 2026-10-30

Release status: **not ready for the complete approved platform scope**.

## Evidence

- 311 unit tests passed across 42 files after localized error messages, retail operations, and company profile branding slots tests were verified. All 14 static checks passed, including security, localization, copy, message formatting, platform and admin checks.
- Prisma client generation and schema validation passed; database and admin TypeScript checks passed cleanly across all 8 packages in the workspace (`turbo run type-check`).
- All 97 migrations applied successfully to the isolated local PostgreSQL test database (`platform_ops_test`) and development environment. Migration 97 (`20261030150000_branding_and_document_customization`) added `fullLogoUrl`, `darkFullLogoUrl`, `documentHeaderUrl`, `documentFooterUrl`, and `timeZone` to `CompanySetting`. No production migration was run.
- Real DB integration tests (`scripts/check-operations-db.cjs`) passed in an isolated disposable database: branch isolation across warehouses, locations, counts, getProductStock, and procurement actions; forged ID rejection; 6-decimal precision; idempotent serial generation; reprint identity preservation; one-time operator confirmation; scan verification; bin relocation; package packing, sealing, moving with atomic serial relocation, and unpacking; serialized sales fulfillment and returns with conservation triggers; balanced immutable journals; period overlap rejection; closed-period immutability; 5-level retail closings with immutability triggers; commission snapshots and reversals; regional store pricing resolution; and active RLS on all 15 operational tables.
- `YES=1 ./run.sh db reset --profile all` executed end-to-end: deployed all 97 migrations, generated Prisma client, seeded volume dataset (18 employees, 110 contacts, 150 deals, 180 invoices, 196 payments, 256 expenses, etc.), seeded complete operational fixtures across branches (`MAIN`, `MALL`), registers (`POS-01`, `POS-02`, `POS-M1`), drawers (`DRAWER-01`, `DRAWER-02`, `DRAWER-M1`), shifts, cashier sessions, payment collections, 5-level closings, packages, serial numbers, regional stores, and commissions, with all 70 database integrity rules holding.
- Source inventory refreshed: 960 source files, 51 API handlers, 365 server actions, 208 models.
- Browser test execution: Playwright E2E spec `tests/e2e/specs/admin/stock-transfers.spec.ts` passed for both English desktop and Arabic mobile (2 passed).

## Migration constraints

Existing warehouses are assigned to a legacy main branch and existing users receive legacy main-branch grants. Existing quantity/batch stock is preserved without inventing serials, cartons or signatures. The migration uses UTC for the legacy branch: deployment must set the actual branch time zone and business-day cutoff before closing is enabled. Historical user access grants need a company role review before branch segregation goes live.

The new ledger has no automatic historical backfill. Opening balances, chart of accounts, fiscal periods, tax setup, reconciliation and a cutover date require an explicit implementation and rehearsal. Keep the new services inaccessible to normal users until operational adapters and permissions are complete.

## Untested or incomplete release scenarios

All physical printing/device checks; all 66 native-language reviews; cross-country storefront selection; branch cart repricing; five-level retail closing; commissions/refunds; procurement three-way matching/landed costs; mixed/nested package operations; serialized sale/return races; external mobile signatures; signed revision replay; full branch export/download matrix; full stock-to-ledger reconciliation; production rollback/restore rehearsal; provider callbacks and late settlement behavior.

Reversal and period-close services are technical foundations, not monthly/yearly operational readiness certification. See the other five reports and the delivery ledger for evidence and remaining work.

Serial continuation: database conservation checks, scan-confirmed activation and same-warehouse bin relocations pass real PostgreSQL checks, including competing requests and rollback of quantity-only adjustments. Cross-warehouse transfers and sales/return integration remain required.

Transfer continuation: exact-serial request, approval, protected transit, partial receipt and internal signed manifest revisions pass PostgreSQL tests. Services still need end-user screens, external signing invitations, package/multi-line integration and discrepancy/closing workflows before release.
