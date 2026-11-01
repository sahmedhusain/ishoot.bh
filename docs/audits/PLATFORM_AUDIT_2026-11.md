# Platform audit — November 2026

A review of the admin and web apps, the database and the modules. It covers performance, logic gaps, security leaks and readiness for multi-company groups and contracting firms. Each finding has a status:
- **Fixed in A1** means it was fixed on the `feat/quick-wins` branch.
- Every other status names the roadmap phase that covers it (see "Roadmap" at the end).

## 1. Security

| Finding | Where | Status |
| --- | --- | --- |
| No security headers. The admin could be framed by any site (clickjacking), and there was no HSTS, no `nosniff` and no referrer policy. | `apps/*/next.config.mjs` | **Fixed in A1.** The admin is limited to `frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN`. The website can only be framed by itself and the admin, which the live preview needs. Both apps now send nosniff and a Referrer-Policy, plus HSTS in production. The admin also sends a report-only CSP, to be enforced after a clean run. |
| The revalidation secret was compared with `!==`, which leaks timing. | `apps/web/app/api/revalidate/route.ts` | **Fixed in A1.** It now uses a SHA-256 + `timingSafeEqual` comparison. |
| Crawlers could index cart, checkout, account and one-time-link pages (`pay`, `track`, `unsubscribe`). Token links could also leak through the Referer header. | `apps/web/app/robots.ts` | **Fixed in A1.** These pages are disallowed in robots.txt and send `X-Robots-Tag: noindex, nofollow` and `Referrer-Policy: no-referrer`. |
| Server actions | `apps/admin/app/actions/*` | **OK.** All 64 files call a guard. |
| Pages that check only that you are signed in: `directory`, `directory/org`, `reports`, `archive`, `team`, `department`, `settings/security` | admin pages | **B2.** Moves to the scope-aware access engine. |
| Token pages: sign, acknowledge, letters, tracking | `client-signatures.ts`, `signature-requests.ts` | **OK.** Tokens are 32 random bytes, stored only as a hash, with an expiry, a rate limit and noindex. |
| `ActivityLog` rows can be updated or deleted, and there is no "on behalf of" | schema | **B2.** It becomes append-only (a database trigger) and gains `onBehalfOfUserId`. |

## 2. Performance

| Finding | Where | Status |
| --- | --- | --- |
| Foreign keys used as filters had no index: `PayrollItem.employeeId`, `LeaveRequest.leaveTypeId`, `SalesOrder.contactId`/`warehouseId`, `Shipment.zoneId`/`vehicleId`, `AttendanceEntry.shiftTypeId` | `schema.prisma` | **Fixed in A1.** Migration `20261101090000_missing_foreign_key_indexes`. |
| `Session.token` was indexed twice: `@unique` plus `@@index` | `schema.prisma` | **Fixed in A1.** The extra index is dropped. |
| Paying a payroll run issued two queries per employee | `queries/payroll.ts` `payItems` | **Fixed in A1.** Now one `updateMany` + one `createMany` (`skipDuplicates`). |
| Social-insurance bulk registration inserted one row at a time | `queries/social-insurance.ts` | **Fixed in A1.** Now one `createMany`. |
| A broadcast marked unsubscribed recipients one by one | `queries/marketing.ts` | **Fixed in A1.** Now one `updateMany`. |
| A cash-on-delivery settlement read each order separately | `queries/fleet.ts` | **Fixed in A1.** All orders are read in one query, and shipments of the same order share what it still owes. |
| Expiry and recurring-bill reminders queried notifications once per reminder | `services/expiry-reminders.ts`, `queries/recurring-expenses.ts` | **Fixed in A1.** One query per run. |
| Request list sorted by priority counted each bucket separately | `queries/requests.ts` | **Fixed in A1.** One `groupBy`. |
| The finance summary loaded every invoice and expense of the period and summed them in JavaScript | `queries/finance-reports.ts` | **Fixed in A1.** Totals now come from `aggregate`/`groupBy`. Cash-basis receipts still read row by row, because VAT is rounded per payment. |
| `seedDefaultPermissions` issued about 11,000 upserts and had no callers | `queries/permissions.ts` | **Removed in A1.** |
| Unused invoice queries: `getInvoicesByDealId`, `getInvoicesByClientId`, `getUnpaidInvoicesByClientId` | `queries/invoices.ts` | **Removed in A1.** |
| No cross-request caching in the admin: 158 pages are `force-dynamic`, and company settings, toggles and permissions are read on every request | `apps/admin/lib/cached-queries.ts` | **B1.** It waits for per-company settings, so cache keys and invalidation are designed once, keyed by company. |
| Payroll calculation writes each employee's item and lines separately | `queries/payroll.ts` ~728 | Open. It runs once a month inside a transaction; batch it when payroll volume grows. |
| Report exports load whole result sets into memory | `queries/reports.ts` | Open. Move them to streamed or paginated exports as data grows. |
| Migration history does not match the schema for the `BranchGrant.userId` and `StockAllocation` foreign keys | `prisma migrate diff` | Open. This drift predates this audit. Add a migration that matches the constraints to the schema before B1. |

## 3. Architecture and logic gaps

**Tenancy**
- The app is single-company. There is no `Company` model, and no `companyId` on any of the 208 models.
- `CompanySetting` is a singleton.
- Covered by **B1**: a company tree (holding → cluster → company → division), with `companyId` on every tenant model, enforced in the data layer.

**Permissions**
- Each user has one global role, and permissions are `(role, resource, action)`.
- Data scope (own / department / all) covers only 5 areas.
- There is no company, branch, project or asset scope, no field masking, no financial ceiling per approver, no delegation and no segregation-of-duties rule beyond quotations.
- Covered by **B2**: a hybrid RBAC + ABAC access engine with assignments, scopes, the extended actions (submit/verify/approve/override), an authority matrix, field policies, delegation and external roles.

**Designations**
- A designation is only free text: `jobTitleEn/Ar`.
- The sidebar "designation tier" is stored in localStorage and only reorders the sidebar.
- There are no grades.
- `Employee` has no manager field.
- Covered by **B3**: `Grade` (G1–G10), `Designation`, org templates, and a home shell per designation (full / field / driver / external).

**Org chart**
- It shows the department tree only, with at most 8 people per department and no reporting lines.
- Covered by **B4**: an interactive group → company → location → department → people tree, plus reporting-lines, location and grade views.

**Branches**
- `Branch` and `BranchGrant` are used only by retail and stock.
- **B1** turns `Branch` into the location model: office, site, warehouse, yard, factory or labour camp, with a geo-fence.

**Projects**
- A project is a task board, with no client, budget, site, team, costs or documents.
- Nothing in purchasing, finance or assets links to a project.
- Covered by **C1–C4**: tenders, BOQ, variations, payment certificates and retention, subcontracts, job costing, site diaries, RFIs, submittals, drawings (IFC), inspections and NCRs, HSE with permit-to-work, labour allocation, the material requisition → delivery workflow, timesheets, schedule and EVM.

**Suppliers**
- A supplier is a CRM contact of type `vendor`. There is no subcontractor type, no prequalification and no rating.
- Covered by **C1**.

**Fleet**
- `Vehicle` holds only plate, name and kind.
- Covered by **D**: trip sheets, e-POD, fuel, defects, workshop and utilisation.

**Facilities management**
- There are no service contracts, SLAs or a ticket desk.
- Covered by **E**.

**HR/PRO**
- `EmployeeCredential` tracks expiry, but there is no PRO workflow, labour-camp management or visa quota.
- Covered by **F**.

## 4. User interface

**Document pages**
- Invoice and receipt detail pages draw an on-screen A4 sheet, while quotations use the Material 3 card layout.
- Covered by **A2**. Printing keeps the PDF documents.

**Page headers**
- There is no shared page header component.
- 14 pages have no standard header, about 20 headers have no description, and only 4 pages set a browser title.
- Covered by **A3**.

**Legacy styling**
- Heavy `dark:` overrides and raw slate/gray/hex colours.
- 58 hand-written tables, with no shared DataTable.
- About 141 strings still use film/production wording.
- Covered by **A3**.

**Website**
- Collection items and articles had no metadata of their own. **Fixed in A1:** each now sets its own title, description and Open Graph image.
- There are no `loading`, `manifest` or `opengraph-image` files. Open.

## Roadmap

The approved plan is kept outside the repo. Its order is:
1. **A1** fixes → **A2** document pages → **A3** headers and Material 3.
2. **B1** multi-entity foundation → **B2** access engine → **B3** grades, designations and templates → **B4** org tree.
3. **C1–C4** projects and contracting suite.
4. **D** fleet and plant, **E** facilities and service desk, **F** HR/PRO.
