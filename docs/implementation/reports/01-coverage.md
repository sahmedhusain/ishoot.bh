# Module, page and workflow coverage — 2026-10-30

Status: implementation in progress. Source inventory is not runtime certification. The historical graph is not used as current runtime evidence.

Current inventory: {"sourceFiles": 960, "apiHandlers": 51, "serverActions": 365, "models": 208, "findManyCalls": 465, "readsWithoutExplicitTake": 321}

The source scanner detects 321 reads without an explicit `take`. This is a review queue, not 321 confirmed pagination defects: callers, intentionally complete CMS collections, authorization and exports need individual assessment.

## Workflow coverage

| Workflow | Current evidence | Remaining verification |
|---|---|---|
| Branch scope | Enforced across branches, warehouses, locations, counts, procurement, and getProductStock; forged ID rejections verified in isolated PostgreSQL | Continual coverage audit across legacy exports/downloads |
| Labels | Generation, retry, reprint, operator print confirmation, and exact-dimension PDF generation verified in unit and DB tests; route `/api/inventory/labels/[id]/pdf` | Physical barcode scanner device validation |
| Serialized bin & package moves | Exact identities, revisions, stock conservation, tamper-evident package sealing, and atomic paired movements verified in PostgreSQL | General multi-tenant stress under high concurrency |
| Serialized sales & returns | `fulfillSerializedOrder` and `returnSerializedOrder` verified in PostgreSQL; transitions to `sold`/`available` with conservation triggers | Web storefront self-service return UI integration |
| Accounting | Balanced immutable posting, periods, reversals, and operational posting adapters (`postSaleJournal`, `postPaymentCollectionJournal`, `postInventoryAdjustmentJournal`) | Automated periodic bank feed reconciliation |
| Search | Anchored combobox implemented; E2E expectations updated | Run browser cases across RTL/mobile/theme and unsaved-change flows |
| Allocation/custody | Single product exact-serial transfer workspace, approvals, dispatch, partial acceptance, shortage reports, handover signing, and closing passed Playwright browser specs (EN desktop & AR mobile) | Multi-line line picking/packing UI |
| Retail sessions/closings | Registers, drawers, shifts, cashier sessions, payment collections, and 5-level closings verified with database immutability triggers | Physical cash drawer hardware trigger integration |
| Commissions | Versioned effective-dated rules, calculation snapshots, and reversing snapshots verified in DB and unit tests | Tiered multi-salesperson split rules |
| Regional store | Regional pricing multipliers, currency resolution in `quoteCart` and `placeOrder`, and `/api/store/regions` endpoint verified | Regional domain mapping in production DNS |
| Branding & Document Customization | Full-sized logo (light/dark) alongside separate icon/logo, customizable letterhead header and footer PNGs with non-conflicting pill page numbering badge, Migration 97, and settings UI verified | Physical printer driver edge margin validation |

## Page inventory

Every page below remains **not exhaustively exercised in this continuation**. Existing unit/static checks do not substitute for route-specific browser verification.

- `apps/admin/app/acknowledge/[token]/page.tsx` — runtime matrix pending
- `apps/admin/app/certificates/[code]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/analytics/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/announcements/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/announcements/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/announcements/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/approvals/[type]/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/approvals/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/archive/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/assets/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/assets/categories/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/assets/handovers/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/assets/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/assets/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/calendar/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/claims/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/claims/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/articles/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/articles/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/banners/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/clients/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/code/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/equipment/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/faqs/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/menus/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/pages/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/pages/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/portfolio/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/reviews/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/stats/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/cms/website/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/company/documents/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/company/documents/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/contacts/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/customers/[id]/edit/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/customers/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/customers/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/deals/[id]/edit/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/deals/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/deals/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/deals/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/crm/leads/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/agencies/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/cash/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/fleet/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/routes/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/routes/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/delivery/settings/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/department/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/directory/org/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/directory/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/driver/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/expenses/categories/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/expenses/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/expenses/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/expenses/recurring/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/finance/commissions/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/finance/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/finance/reports/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/attendance/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/documents/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/employees/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/employees/import/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/employees/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/employees/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/gosi/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/handovers/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/handovers/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/leave/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/payroll/items/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/payroll/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/pensions/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/requests/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/settings/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/settlements/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/settlements/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/settlements/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/hr/supports/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/inventory/counts/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/inventory/counts/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/inventory/movements/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/inventory/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/inventory/warehouses/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/invoices/[id]/edit/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/invoices/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/invoices/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/invoices/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/legal/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/legal/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/letters/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/letters/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/letters/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/letters/templates/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/marketing/audience/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/marketing/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/moms/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/moms/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/moms/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/notifications/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/orders/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/orders/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/orders/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/orders/settings/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/payments/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/payments/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/payments/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/press/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/bills/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/bills/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/bills/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/orders/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/orders/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/orders/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/requisitions/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/requisitions/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/requisitions/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/rfqs/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/rfqs/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/procurement/suppliers/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/products/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/products/categories/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/products/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/products/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/profile/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/quotations/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/quotations/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/quotations/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/reports/[key]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/reports/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/requests/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/requests/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/requests/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/requests/settings/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/services/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/approvals/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/audit/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/company/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/departments/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/integrations/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/modules/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/pipeline/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/preferences/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/roles/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/security/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/settings/web/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/tasks/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/tasks/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/tasks/projects/[id]/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/tasks/projects/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/team/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/users/new/page.tsx` — runtime matrix pending
- `apps/admin/app/dashboard/users/page.tsx` — runtime matrix pending
- `apps/admin/app/login/forgot/page.tsx` — runtime matrix pending
- `apps/admin/app/login/page.tsx` — runtime matrix pending
- `apps/admin/app/login/reset/page.tsx` — runtime matrix pending
- `apps/admin/app/page.tsx` — runtime matrix pending
- `apps/admin/app/setup/page.tsx` — runtime matrix pending
- `apps/admin/app/sign/[token]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/[collection]/[slug]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/[collection]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/about/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/account/orders/[id]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/account/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/cart/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/checkout/done/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/checkout/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/contact/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/pay/[token]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/press/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/track/[token]/page.tsx` — runtime matrix pending
- `apps/web/app/[locale]/unsubscribe/[token]/page.tsx` — runtime matrix pending
