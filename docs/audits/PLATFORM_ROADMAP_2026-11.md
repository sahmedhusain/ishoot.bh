# Platform audit & roadmap: conglomerate governance, access engine, contracting suite, document & M3 polish

## Context

You asked for a senior engineer and business owner review of the whole platform:
- performance, logic gaps and leaks;
- holding groups made of companies, branches/locations, departments and employees, with privileges at every level;
- designations that get their own features;
- suppliers and subcontractors, and a full projects suite for engineering consultancy and contracting firms;
- an org-tree page;
- better page headers;
- invoice and receipt pages that look like the quotation page;
- Material 3 on every admin page.

You then added a reference design for a multi-entity contracting group:
- a hybrid RBAC + ABAC engine with 4 dimensions: scope, module, action and contextual constraints;
- grades G1–G10 and a full designation directory for HQ shared services and for operating companies (contracting, MEP, FM, factory, trading);
- workflows with segregation of duties: material requisition → delivery, and overtime → payroll;
- multi-hat assignments, time-bound delegation, the HSE stop-work override, and external consultant/auditor roles;
- fleet, FM service desk, tendering and PRO modules.

Decisions so far:
- **Full legal entities.**
- **Order of work:** quick wins → org and governance → projects and operations.
- **Projects:** the full suite.

The reference group is a design model only. No real company name goes into code or seeds (`pnpm test:brand`). It ships as a neutral "contracting group" org template.

### Audit findings (current state)

**Tenancy**
- The app is single-company. There is no `Company` model and no `companyId` on any of the 208 models.
- `CompanySetting` is a singleton (`schema.prisma:121`).
- `Branch` and `BranchGrant` exist, but only retail and stock use them (`queries/branches.ts:5`).

**Permissions**
- Each user has one global `User.role`, plus `Permission(role, resource, action)` rows and JSON overrides (`queries/permissions.ts:161`).
- Actions: read, write, delete, export, approve, create, edit, assign, issue_send, manage_permissions, reset_credentials (`constants/permissions.ts:52`). There is no submit, verify or override.
- `RoleDataScope` covers only 5 areas: deals, requests, expenses, claims and leave.
- There is no company, department, project or asset dimension, and no field masking.
- Approvals:
  - `ApprovalPolicyStep` already has `minAmount`, `minDays`, escalation and maker-checker (`allowSelfApproval`).
  - Its `role` and `permission` modes resolve across the whole company (`services/approval-engine.ts:432`).
  - There is no delegation.

**Designations**
- A designation is only free text: `Employee.jobTitleEn/Ar`.
- `DesignationTier` (`lib/sidebar-navigation.ts:22`) is stored in localStorage and only reorders the sidebar.
- There are no grades.
- `Employee` has no manager field; reporting lines live only on `User.managerId`.
- Drivers are not routed to `/dashboard/driver` automatically.

**Org chart**
- `getOrgChart` (`queries/departments.ts:297`) shows the department tree only, caps each department at 8 people, and ignores reporting lines.

**Projects**
- `Project` (`schema.prisma:3909`) is a task board.
- No purchasing, finance or asset record links to a project.

**Suppliers**
- A supplier is a `CrmContact` with `contactType="vendor"`.
- There is no subcontractor type, and `Asset.supplier` is free text.

**Fleet**
- `Vehicle` has only plate, name and kind.
- There are no fuel logs, defects, maintenance or utilisation records.

**Attendance**
- `AttendanceEntry` has no GPS, site or cost code, and the only sources are manual, bulk and import.
- `EmployeeCredential` already tracks visa/ID expiry.

**Audit log**
- `ActivityLog` can still be edited (it is not append-only) and has no "on behalf of" field.

**Documents**
- Invoice and receipt detail pages draw an on-screen A4 sheet (`InvoiceTemplate`, `ReceiptTemplate`).
- The quotation page uses an M3 card layout (`QuotationDetailView.tsx:294-668`).
- All three print a server PDF (`lib/pdf-print.ts` → `/api/documents/[id]/pdf` → `lib/pdf/*`).

**UI**
- There is no shared PageHeader, only the `data-page-header` CSS (`app/page-regions.css:2`).
- 14 pages have no header, about 20 headers have no description, and only 4 pages set a browser title.
- Legacy styling: `dark:` overrides, raw slate/gray/hex colours, and 58 raw tables with no DataTable.
- About 141 strings still use film/production wording.

**Performance**
- No caching: 158 pages are `force-dynamic`.
- Finance and report totals are summed in JavaScript (`finance-reports.ts`, `reports.ts`, `stats.ts:102`).
- Database calls run inside loops: `payroll.ts:728,995`, `social-insurance.ts:448`, `marketing.ts:497`, `fleet.ts:649`, `expiry-reminders.ts:50`, `recurring-expenses.ts:390`, `requests.ts:556`, `permissions.ts:135`.
- Missing indexes:
  - `PayrollItem.employeeId`
  - `LeaveRequest.leaveTypeId`
  - `SalesOrder.contactId` and `SalesOrder.warehouseId`
  - `Shipment.zoneId` and `Shipment.vehicleId`
  - `AttendanceEntry.shiftTypeId`
- `Session.token` is indexed twice.
- There are dead queries.

**Security leaks**
- Neither app sets security headers, so the admin can be framed (clickjacking).
- The web revalidate route compares its secret with `!==`.
- `robots.ts` lets crawlers into cart, checkout, account and the token pages.
- The `pay`, `track` and `unsubscribe` pages are not noindex or no-referrer.
- Product and article pages have no metadata of their own.

### Working rules

- One branch per track and one commit per phase.
- No brand strings.
- New copy goes in `packages/locales` in both EN and AR.
- `pnpm db:reset` is local only.
- Test servers use ports 3012–3014.
- Every new model is a tenant model from the day it is created.

---

## Track A — Quick wins (branch `feat/quick-wins`)

### A1: Performance and security fixes

**Security headers.** Add `headers()` to both `next.config.mjs` files:
- HSTS, nosniff and Referrer-Policy.
- Admin: `frame-ancestors 'none'`.
- Web: frames allowed only from `ADMIN_URL`, for the CMS preview.
- CSP starts report-only, then is enforced.

**Web routes**
- Switch `apps/web/app/api/revalidate/route.ts` to `timingSafeEqual`.
- `robots.ts`: disallow cart, checkout, account, pay, track and unsubscribe.
- Mark the token pages noindex + no-referrer.
- Add `generateMetadata` to `[collection]/[slug]`.

**Indexes.** One migration adds the missing indexes and drops the duplicate `Session` index.

**Database calls in loops**
- Use `updateMany`/`createMany` (with `skipDuplicates` where seeding).
- Load records once with `findMany({ id: { in } })`.
- Use `groupBy` instead of per-group counts.

**Report queries**
- Move the report totals into SQL with `aggregate`/`groupBy`.
- Add a `select` to `social-analytics.ts:195`.

**Cleanup**
- Remove the dead queries; `knip` confirms they are unused.

**Caching**
- Put company settings, feature toggles and role permissions in `unstable_cache` with tags.
- Invalidate those tags with `revalidateTag` in the settings and roles actions.

**Audit document.** Commit the audit as `docs/audits/PLATFORM_AUDIT_2026-11.md`.

### A2: Invoice and receipt pages like the quotation page

**1. Extract shared pieces from `QuotationDetailView.tsx`** into `apps/admin/components/documents/`:
- `DocumentDetailHeader`
- `DocumentStatusBanner`
- `DocumentLinesCard`
- `DocumentTotals` (with optional paid and balance rows)
- `DocumentInfoCard`

Refactor the quotation page to use them, with no visual change.

**2. Rewrite `InvoiceDetailView`**
- Header actions: Mark sent, Edit, Record payment, Print, Download, and an Email/WhatsApp menu.
- Left column:
  - Status banner with balance due.
  - Lines card and totals.
  - Terms card.
  - "Payments received" card.
- Right column:
  - Client card.
  - Lifecycle card.
  - Links card: quotation, deal, and later the project.

**3. Rewrite `PaymentDetailView`** (receipts)
- Left column:
  - Status banner.
  - Allocation table.
  - Method/reference card.
  - The settlement vault card.
- Right column: payer card and lifecycle card.

**4. Printing is unchanged.** It still uses the react-pdf documents (`lib/pdf/invoice-pdf.tsx`, `receipt-pdf.tsx`). The paper templates stay mounted as `hidden print:block` with `data-print-target`, so browser Ctrl+P still prints the paper.

### A3: Page headers and Material 3 conformance

**`PageHeader` component.** Create `apps/admin/components/layout/PageHeader.tsx` on top of the existing `data-page-header` CSS. Props: `icon`, `eyebrow`, `title`, `description`, `meta`, `actions`, `back`.

**Page copy**
- Add locale keys `pages.<routeKey>.{title,description}` in EN and AR, with rewritten descriptions.
- Add a `pageMetadata()` helper so every page sets its browser title.
- Replace the film/production wording with neutral words.

**Migrate pages**
- Move every dashboard view to `PageHeader`.
- Restyle the non-conforming views: `MomDetailView`, `PayrollItemView`, `RouteSheetView`, `SocialAnalyticsView`, `NotificationInboxView`, `LettersListView` and the CMS editors.
- Remove raw colours and `dark:` overrides.

**Shared table.** Add a `DataTable` to `packages/ui` and move list pages to it.

**Guard tests**
- A static test: every dashboard page uses `PageHeader` and exports metadata.
- Add an M3 conformance column to `docs/ADMIN_UI_ROUTE_AUDIT.md`.

---

## Track B — Conglomerate structure and governance (branch `feat/group-governance`)

### B1: Multi-entity foundation

**Company tree**
- New model `Company`, arranged as a tree with `parentId`.
- `kind`: `holding | cluster | company | division`. A cluster is a business-unit grouping such as civil, MEP, FM or trading.
- Legal and registration fields moved from `CompanySetting`: CR, VAT, country, base currency, fiscal year, logo and letterhead.
- `industryPreset` and `domains[]`.
- `CompanySetting` becomes one row per company.

**Shared services.** `Department.isSharedService` plus `servesCompanyIds` model HQ departments that serve the subsidiaries: finance, HR/PRO, IT, legal, procurement, fleet, QHSE.

**Locations.** `Branch` becomes the location model:
- `companyId`, `type` (`office | site | warehouse | showroom | yard | factory | labour_camp`), address.
- `lat`/`lng` and `geofenceRadiusM`, used by geo-fence constraints.
- `managerId`.

**Classify every model** in `packages/database/src/tenancy/models.ts` as tenant, child or global. A static test fails if any model is missing.
- Tenant models get `companyId` and indexes on `[companyId, …]`.
- Unique keys become per company, e.g. invoice numbers and sequences.

**Migration and backfill**
- Create one `Company` from the current `CompanySetting`.
- Backfill `companyId` on every tenant table, then make it NOT NULL.
- Add an integrity check script.

**Enforcement in the data layer**
- A `companyContext` AsyncLocalStorage, set in `requireAuth`.
- A Prisma `$extends` query extension in `db.ts`. For tenant models it adds `companyId` to `where` and `data`, and throws when no context is set.
- Explicit escape hatches: `withCompanies([...])` for group views, and `asSystem()` for cron and webhooks.
- Raw SQL is updated by hand and covered by a static check.

**Session and UI**
- `Session.activeCompanyId` and a company switcher.
- A "Group" mode that is read-only and consolidated across the companies a user can reach.

**Settings per company:** modules, approvals, HR policies, taxes, templates. A new `settings/companies` page manages them, and the setup wizard creates the first company.

**Web app.** Resolves its company from the request host.

**Group reports.** Consolidated P&L, cash, receivables and headcount, converted with `ExchangeRateSnapshot`. Intercompany elimination comes later.

### B2: Access engine (hybrid RBAC + ABAC, 4 dimensions)

New module `packages/database/src/access/`. One `can(subject, module, action, resource?, context?)` function decides every check.

**Dimension 1 — Scope**
- Scope levels: `GROUP > COMPANY (SBU) > BRANCH > DEPT > PROJECT > ASSET > SELF`.
- New model `Assignment` holds the multi-hat tuple: `userId`, `companyId`, `roleId`, `departmentId?`, `branchId?`, `projectId?`, `assetId?`, `designationId?`, `scope`, `validFrom`/`validUntil` (secondment or acting), `isPrimary`, `appliesToSubsidiaries`.
- One login can hold several assignments, for example Senior Engineer in company A and Acting PM on a project in company B.
- The active company plus the user's assignments decide the effective grants.
- Assignments replace the global `User.role`, which stays only as a fallback during migration.

**Dimension 2 — Module.** Resources are grouped into the 8 operating modules:
1. HR, attendance and PRO
2. Project and site execution
3. Procurement and stores
4. Fleet and plant
5. Commercial, tendering and QS
6. Finance and cost control
7. Facilities and service desk
8. Administration and audit

**Dimension 3 — Actions**
- Extend `ALL_ACTIONS` with `view`, `create`, `edit_draft`, `submit`, `verify` (L1), `approve` (L2/L3), `override`, `export`, `reject_return`.
- The existing actions map onto these through a compatibility table, so current `requirePermission` calls keep working.

**Dimension 4 — Contextual constraints**
- **Financial ceilings.** A new `AuthorityMatrix` sets the maximum amount per designation or grade, per module and document type, per company. The approval engine uses it to route by amount: Assistant Manager L1 → GM → COO/CFO. This builds on the existing `minAmount` steps.
- **Field masking.** `FieldPolicy` marks field groups — `compensation`, `cost_rates`, `commercial_values` (BOQ rates, margins), `bank_details` and `personal_ids` — as visible or masked per role or designation. Masking is applied in query serializers (`packages/database/src/access/mask.ts`), never only in the UI. For example, a site engineer sees BOQ quantities but not money.
- **Geo-fence.** Some actions — clock-in, site goods receipt, e-POD — need the device to be inside the location's radius. Coordinates are validated on the server.
- **State rules.** Records lock once posted or completed (for example, trips once completed). Users can only reject or return, never delete what was submitted.

**Segregation of duties**
- A policy rule: the same user cannot both submit and approve, or verify and approve, the same record unless the policy allows it.
- This generalises the existing quotation maker-checker into `approval-engine.ts`.

**Delegation of authority**
- New model `Delegation`: from, to, scope, modules, `validFrom`/`validUntil`, reason.
- Approvals made by a delegate record `onBehalfOfUserId` in `ApprovalDecision` and `ActivityLog`, shown as "approved by X on behalf of Y".

**Special privileges.** Capabilities that ignore rank:
- `hse_permit_revoke`: the HSE stop-work override. It locks a permit-to-work or freezes an asset, and only the division HSE manager or group QHSE director can clear it.
- `override` on posted records, which requires a reason.

**External roles**
- `client_consultant` and `external_auditor` assignments, limited to one project and to named document types: submittals, inspection requests, HSE logs.
- They use a restricted shell, never see internal costs or internal drafts, and are invite-only, with expiry.

**Approval modes.** Add `branch_manager`, `company_manager`, `designation`, `grade_min`, `project_role` and `authority_matrix`. The `role` and `permission` modes resolve only inside the record's company.

**Audit log**
- `ActivityLog` becomes append-only: a database trigger blocks UPDATE and DELETE.
- New fields: `companyId`, `onBehalfOfUserId`, `assignmentId`.

**Data scope.** Every list query goes through `scopeWhere(subject, module)`. It replaces `lib/data-scope.ts`, `task-scope.ts` and `delivery-scope.ts`, which become thin wrappers.

**Roles screen.** `settings/roles` becomes a matrix editor per company: actions × modules, with default scopes, field policies and an authority matrix tab.

### B3: Grades, designations, org templates and role-based homes

**Grades**
- New model `Grade`: G1–G10 with a band (Board … Operative), per group, with an optional company override.
- A grade drives default benefits, visa quota class and the authority ceiling.

**Designations**
- New model `Designation`: `code`, name EN/AR, `gradeId`, `category`, `discipline?` (civil, MEP, fire, fit-out, …), `defaultRoleId`, default scope, `homeShell`, `homeDesk`, capability flags.
- `Employee` gains `designationId`, `gradeId`, `managerId` (kept in sync with `User.managerId`), `branchId` and `companyId`.

**Org templates** live in `packages/database/src/constants/org-templates/`, as data (catalogue files, not code). Each template seeds departments, sub-departments, designations and default access profiles. Picking a template is a step in the setup wizard or in `settings/companies`.

The templates:
- **Group HQ shared services:**
  - executive office;
  - finance and treasury;
  - HR, admin, PRO and labour camps;
  - IT and ERP;
  - legal, audit and risk;
  - business development, PR and tenders;
  - supply chain, central stores and fleet;
  - QHSE.
- **Contracting company:**
  - GM and DGM;
  - operations and projects;
  - tendering and estimation;
  - commercial and QS;
  - engineering and BIM;
  - planning, project controls and document control;
  - QA/QC;
  - HSE;
  - site execution, from Senior PM down to helpers, including surveying, foremen, chargehands, the skilled trades and plant operators.
- **Engineering consultancy:**
  - design studios by discipline;
  - site supervision;
  - BIM;
  - contract administration.
- **Factory / fabrication:** plant, production, CNC, shop floor, QC and dispatch.
- **FM / security / cleaning:**
  - FM operations, CAFM helpdesk and technicians;
  - the security hierarchy;
  - soft services and rope access.
- **Trading / showroom:** B2B and retail sales, product/brand managers, showroom, after-sales and spare parts.

**Access profiles** come with the templates and match your matrix: Group CEO/COO, Group CFO, Group HR Director, Subsidiary GM, Projects Director, Assistant Manager, Project Manager, QS, Site Engineer, Safety Officer, General Foreman and Driver. Each has the module × action × scope cells and masking from your table. They can be edited per company.

**Home shells**
- A designation decides the shell:
  - `full` (web dashboard);
  - `field` (mobile-first for site engineers, foremen and safety officers);
  - `driver` (simplified, bilingual, high-contrast);
  - `external` (consultant portal).
- `lib/dashboard-focus.ts` gains desks: group cockpit, company GM, department queue/SLA, project, site, driver.
- Field and driver users go straight to their shell. The localStorage `DesignationTier` becomes a default that comes from the designation.
- The admin app becomes an installable PWA (manifest + offline-tolerant forms), used by the field and driver shells.

### B4: Org tree page

- Rebuild `/dashboard/directory/org` with a new `queries/org-tree.ts`. It loads subtrees lazily through a route handler, with no 8-person cap.
- **Views:**
  - **Structure:** Group → Clusters → Companies → Locations → Departments → People. Shared-service departments are drawn with links to the companies they serve.
  - **Reporting lines.**
  - **By location.**
  - **By grade.**
- **Features:**
  - Pan and zoom, expand and collapse, search-and-focus.
  - Filters by company, location, department, designation and grade.
  - Person card: photo, designation, grade, contacts, direct reports, active assignments and acting roles.
  - Headcount per node.
  - Export to PNG/PDF.
  - RTL support.
- **Rendering:** `d3-hierarchy` for layout, with M3 HTML/SVG nodes.
- What a viewer sees is limited by `scopeWhere`.

---

## Track C — Projects and contracting suite (branch `feat/projects-suite`)

Everything sits behind the `projects` module and is scoped by project assignments.

### C1: Commercial and QS

**Tenders**
- New model `Tender`, a pipeline with prequalification. Its government tender board and portal references are text fields only.
- Go/no-go decision, estimate, then submission.
- A won tender becomes a project.

**Upgrade `Project`**
- Company, branch/site location, client, deal, contract.
- `type`: consultancy, design, supervision, construction, fit-out, MEP, FM contract.
- `contractType`: lump sum, remeasured, cost-plus or T&M.
- Contract value, currency, budget, retention %, advance %, DLP months.
- Lifecycle: tender → awarded → mobilization → execution → substantial completion → DLP → closed.

**New models**
- `ProjectMember`: user, project role, dates.
- `Wbs`/`CostCode`.
- `BoqSection`/`BoqItem`.
- `BudgetLine`.
- `Variation`: client variation orders plus their time impact.
- `ProgressClaim`/`PaymentCertificate` (IPC): cumulative % per BOQ item, previous amount, retention, advance recovery, VAT. It generates an `Invoice`.
- `Subcontract` and `SubcontractValuation`. A valuation generates a `SupplierBill`.
- `BankGuarantee`: performance, advance or retention bonds with expiry alerts.

**Job costing.** Add `projectId` (and `costCodeId`) to:
- PR/MR, PO, `SupplierBill`;
- `Expense`, `ExpenseClaim`, petty cash;
- `Invoice`, `Quotation`;
- `StockMovement`, asset assignment, `CalendarEvent`.

**Suppliers**
- `CrmContact.contactType` gains `subcontractor`.
- Supplier profile: trades, prequalification, expiry of CR and insurance, and a post-PO performance rating.

### C2: Site execution, quality and HSE

**New models**
- `SiteDiary` / daily construction report: weather, manpower by trade, plant, progress % against the WBS, delays, timestamped photos. The site engineer submits and the PM approves.
- `Rfi`.
- `Submittal`: revisions, codes A–D.
- `Drawing`/`DrawingRevision` with status (draft, for approval, IFC, superseded). Site roles see IFC revisions only.
- `InspectionRequest` (WIR/MIR) → QA/QC.
- `Ncr`/`Snag`.
- `HseIncident`, toolbox talks.
- `PermitToWork`, carrying the stop-work lock.

### C3: Site labour and materials (workflows with segregation of duties)

**Labour allocation**
- New model `LabourAllocation`: the foreman or site engineer assigns crew hours to WBS/BOQ cost codes.

**Overtime workflow**
1. The foreman proposes overtime.
2. The site engineer verifies it and tags the WBS code.
3. The PM approves it before a cutoff time set per company.
4. Attendance is cross-checked: approved overtime vs the actual check-out time.
5. The HR assistant manager locks the timesheets.
6. Payroll picks them up.

**Attendance changes**
- `AttendanceEntry` gains `branchId` (site), `lat`/`lng`, `source: gps | device | manual`, and `costCodeId`.
- Clock-in is geo-fenced.
- A signed device-ingest API for biometric terminals.

**Material workflow**
1. A foreman draft becomes a site engineer `MaterialRequisition`, raised against BOQ items.
2. The QS verifies it against the budget.
3. The PM approves.
4. Central stores check stock:
   - if in stock: issue a `MaterialIssueVoucher` and dispatch a driver trip;
   - if not: send an RFQ, then a PO, approved through the authority matrix by amount.
5. The driver delivers with a QR gate pass and e-POD.
6. The site GRN is geo-fenced.

This reuses the existing requisition, RFQ, PO, goods receipt and stock transfer models, extended with project and cost code. Tool crib issue and return reuse `AssetHandover`.

### C4: Schedule, time, consultancy and controls

- `ProjectMilestone`/`Activity` with baseline and actual dates and dependencies, plus a Gantt view.
- `Timesheet` for white-collar staff, feeding T&M billing.
- Consultancy fee stages.
- **Reports:**
  - EVM (CPI/SPI);
  - budget vs actual and cost-to-complete;
  - WIP;
  - retention receivable and payable;
  - subcontractor liability;
  - overdue RFIs, submittals and NCRs;
  - project P&L.
- **Inter-company manpower loans:** a request → approval → assignment in the other company, with internal recharge.

### Pages and PDFs

**Pages**
- `/dashboard/projects`: portfolio list.
- `/dashboard/projects/[id]` with tabs: Overview, Team, Schedule, BOQ, Budget & Costs, Variations, Billing, Subcontracts, Procurement, Site Diary, Labour, RFIs, Submittals, Drawings, Inspections & NCR, HSE & PTW, Timesheets, Documents, Tasks.
- Field-shell versions of the site diary, MR, overtime, inspection request, snag and GRN screens.
- The old `tasks/projects` routes redirect to the new pages.

**PDFs** use `lib/pdf/kit.tsx`: IPC, variation, RFI, daily report, inspection request, MIV, gate pass.

---

## Track D — Fleet and plant (branch `feat/fleet-plant`)

**Upgrade `Vehicle`/plant**
- Category: light, heavy truck, crane, bus, excavator, forklift.
- Company, assigned driver.
- Registration and insurance expiry.
- Odometer and engine hours.

**New models**
- `TripSheet`: manifest, plus the status flow pre-trip inspection → en route → at gate → offloaded → completed. It locks once completed.
- `GatePass`.
- `ProofOfDelivery`: signature or QR, photos.
- `FuelLog`: pump photo, odometer.
- `VehicleDefect` → `WorkOrder` for the workshop.
- `PlantUtilisation`: hours, idle cost.

**Driver shell** (scope SELF + assigned asset): attendance, trips, e-POD, fuel, defects, own payslip, licence expiry.

**Group view.** Fleet utilisation across all companies.

**Later.** Live GPS telematics, through an integration endpoint.

## Track E — Facilities management and service desk (branch `feat/fm-service-desk`)

**New models**
- `ServiceContract` (AMC): client site, scope, SLA.
- `PpmSchedule`.
- `ServiceTicket`: priority and SLA timers for response and resolution, CAFM categories.
- Technician dispatch with geo check-in.
- Parts usage from stock.
- Client sign-off.

**Billing.** Recurring AMC invoicing through the existing invoice flow.

**Reuse.** Existing `requests` and `services` patterns where they fit.

## Track F — HR and PRO extensions (branch `feat/hr-pro`)

- A PRO dashboard over `EmployeeCredential`: visa, CPR and LMRA expiry, with renewal workflows and government-fee tracking.
- Labour camps: rooms, occupancy, welfare.
- Headcount by grade and visa quota.
- Inter-company transfers.

---

## Order of work

1. **A1 → A2 → A3.**
2. **B1** (risky foundation; must land before any new models).
3. **B2 → B3 → B4.**
4. **C1 → C2 → C3 → C4.**
5. **D, E and F**, which can run in parallel sessions once B2 is in.

## Verification (every phase)

**Checks**
- `pnpm typecheck`, `lint`, `test`, `test:brand`, `knip`.
- `prisma migrate dev` on a `*_test` database.
- `pnpm db:reset` on the demo profile, plus a new neutral "contracting group" demo profile in `company/profiles/` that uses the templates.

**Track A**
- E2E runs on ports 3012–3014.
- Screenshots of the invoice, receipt and quotation pages in EN/AR and light/dark.
- Print PDFs and confirm they are unchanged.
- Confirm the headers with `curl -I`.

**Track B**
- Isolation tests: two companies, and no list, detail, report or raw SQL query crosses between them.
- Engine tests, one table-driven case per cell of your 12-role matrix: scope, actions, masking (for example, a site engineer gets quantities without money), ceilings, segregation of duties, delegation windows, the stop-work lock, and external roles.
- Append-only audit test.

**Track C**
- IPC maths: cumulative %, retention, advance recovery, VAT.
- E2E flows:
  - MR → QS → PM → MIV/PO → e-POD → GRN;
  - overtime proposal → payroll;
  - BOQ → IPC → invoice;
  - subcontract valuation → supplier bill.

**Tracks D and E**
- Trip state machine and its lock.
- Geo-fence rejection.
- SLA timer tests.