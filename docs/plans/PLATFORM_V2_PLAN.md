# Platform v2 plan: any activity, any department, commerce and a full CMS

Written 2026-10-25, after `feat/website-purposes` and `feat/admin-neutral-wording` were merged into `main`.
It is the brief for the implementation session. Work phase by phase, one branch, **one commit per phase**
(or per sub-phase when a phase is large). Every phase ends with `pnpm type-check`, `pnpm lint`, `pnpm test`,
`pnpm test:copy`, `pnpm test:brand`, `pnpm test:action-schemas`, `pnpm audit:unused` and the relevant e2e specs green.

## 0. Ground rules (unchanged from earlier work)

- No company names, colours or brand files in `apps/` or `packages/` (`pnpm test:brand`). All display text in
  `packages/locales` (both languages, same keys); activity-specific wording through overlays, like
  `packages/locales/src/website-activities.json`.
- Content languages: a single-language company fills each field once (`LanguageFields`, `mirrorBilingual`).
- New modules are `FeatureToggle`s and recommended per activity in `ACTIVITY_PRESETS`; the sidebar hides what
  is off. New resources go into `ALL_RESOURCES` and role defaults; server actions get generated schemas.
- Do not change the overall visual design. Enhance it.
- Secrets (payment keys, OAuth client secrets) live encrypted in `IntegrationSetting`, never in the browser.
- Anything that needs real merchant accounts, OAuth apps or DNS works in **test/sandbox mode** with clear
  setup instructions; switching to live is the company's step.

## Phase 1: Audit, links and attachments, domain

1. **Activity relevance matrix**: for every admin route (`apps/admin/app/dashboard/**`) record which activities
   need it, which module gates it and which permission guards it. Save as `docs/audits/ADMIN_ACTIVITY_MATRIX.md`.
   Fix screens that assume media (equipment-only flows, "shoot" fields in deals/calendar, production stages).
2. **Deal stages**: replace the hard-coded production stages with per-company pipelines (stage list stored in
   the database, seeded from the activity preset; existing deals keep their stage ids). Pick up the proposal the
   admin-wording session left in its notes.
3. **Link and attachment audit**: a Playwright crawler spec that signs in, visits every sidebar and in-page link
   in the admin and every page of the website (both languages), and fails on 4xx/5xx, broken images, downloads
   that do not return the file, `target="_blank"` without `rel="noreferrer"`, and links that hard-code a locale or
   `/works`. Check every attachment path (`/api/files/*`): uploaded, listed, downloadable by the right
   permissions, refused to others, and present in the company archive. Fix everything it finds.
4. **Domain**: setup wizard (Company or Website step) and Settings → Website ask for the public website domain
   and the admin domain (optional). Store them on `CompanySetting` (`websiteDomain`, `adminDomain`). Use them for
   `publicSiteUrl`, sitemap, metadata, emails, invoice and quotation links and the admin's links to the website,
   with environment variables still winning when set. Show DNS instructions (CNAME/A records for the hosting in
   `docs/OPERATIONS.md`) and a **Check domain** button that fetches `https://<domain>/api/health` (add the route)
   and reports the result. No DNS is changed by the app.

## Phase 2: Departments, roles and people at scale

1. **Departments**: Settings → Departments: create, rename, nest (parent department), manager, deputy, cost centre.
   Seed per activity. The **department catalogue** covers management, finance, HR, sales, marketing,
   PR and communications, legal, procurement, warehouse and inventory, delivery and logistics, customer service,
   operations or production, IT and administration.
2. **Role templates** instead of media roles: owner, administrator, department manager, finance manager,
   accountant, HR manager, HR officer, sales manager, sales rep, marketing manager, PR officer, legal counsel,
   procurement officer, warehouse keeper, delivery coordinator, driver, customer service agent, content editor,
   employee (self-service), viewer. Keep existing role ids working: map `production_manager` → operations
   manager and `producer` → project lead through a migration that keeps permissions and users.
3. **Data scope per permission**: own, department (including sub-departments), or all. Apply to deals,
   requests, expenses, claims, leave, tasks, orders, purchase requests and deliveries. Managers approve their
   department through the existing approval engine (route approval steps to department manager or role).
4. **Scale**: CSV import for employees and users (with validation preview), bulk role and department changes,
   pagination and indexes for every list (test with 2,000 employees and 50,000 records in a seeded volume run),
   an org chart, and people search.

## Phase 3: CMS v2 (pages, sections, menus, articles, embeds)

1. **Pages**: a `CmsPage` model (slug, titles, SEO, status, page type, order) made of **blocks**. Block types:
   hero (the three styles), rich text, image and text, gallery, video, catalogue list or grid (filterable),
   services, stats, testimonials, FAQ, client logos, call to action, contact form, map, team, latest articles,
   columns or grid, spacer and divider, and **custom code**. The current homepage sections and About and Contact
   become seeded pages built from these blocks (migration keeps current content and order). Add, remove, reorder,
   duplicate and hide pages and blocks; pages can be in the header menu, the footer menu, both or neither.
2. **Menus**: header and footer menu editors with internal pages, the catalogue, articles and external links.
3. **Articles** (news, updates, posts, press releases): a `CmsArticle` model with category, tags, author, cover
   image, excerpt, publish date and scheduling, featured flag and SEO. A **rich text editor that feels like Word**
   (TipTap): headings, bold/italic/underline, alignment, RTL/LTR per paragraph, lists, tables, quotes, links, images
   uploaded through the normal upload flow with captions, galleries, video and embed blocks, and paste from Word
   or Google Docs with clean-up. Store JSON and render sanitized HTML on the website. Website: `/[locale]/news`
   (name per activity), category pages, article page with share links, RSS feed, "latest articles" block.
   PR uses the press-release category.
4. **Custom code and embeds**: a block that renders HTML, CSS and JS in a **sandboxed iframe** (`srcdoc`,
   `sandbox="allow-scripts allow-popups allow-forms"`, no same-origin) that auto-sizes. A site-wide "code in head
   and body" setting for analytics and pixels. Both need a new permission `cms:code` (owner and administrator
   only by default), are audit-logged, shown in preview before publishing, and documented in `docs/SECURITY.md`.
   Known embed presets: Google Maps, YouTube, Vimeo, Instagram post, Calendly, Typeform, Google Analytics,
   Meta Pixel, TikTok Pixel.
5. Everything stays draft → preview → publish with the existing snapshot and revalidation flow.

## Phase 4: Setup wizard v2, more activities, more themes

1. **More activities** in `ACTIVITY_PRESETS` (each with modules, departments, role templates, website pages and
   blocks, wording overlay, suggested style and sample content): online store (e-commerce only), beauty and
   salon, fitness and gym, automotive, logistics and transport, travel and tourism, hotel, law firm, NGO and
   nonprofit, pharmacy, manufacturing, IT and software, plus the eleven existing ones.
2. **More themes**: at least 20 style presets with a gallery, including light and dark **website** modes. The
   website is dark-only today, so add a light website palette through tokens, without changing layouts.
3. **Wizard experience**: animated step transitions (framer-motion, reduced-motion respected), animated
   progress, celebratory finish. A **live preview** beside the Brand and Website steps shows the real website
   (preview route with the draft config) at desktop and phone width. **Examples**: each activity card shows a
   sample homepage thumbnail, and "Show an example" opens the demo website for that activity. An option
   **Start with sample content** fills banners, catalogue items, services, FAQs and an article for the activity,
   marked as samples so one click removes them.
4. Domain (phase 1) and departments and roles (phase 2) appear as wizard steps or sections.

## Phase 5: Products, inventory and procurement

1. **Products**: `Product` (SKU, barcode, names, descriptions, category, brand, unit, cost, price, tax rate,
   images, variants with options, active) linked to the website catalogue item for product activities, so price
   and availability come from one place.
2. **Inventory**: warehouses and locations; a **stock movement ledger** (receipt, sale, return, transfer,
   adjustment, write-off) as the only way stock changes; on hand, reserved and available per location;
   reorder points and low-stock alerts; **stock counts** (full or cycle, scan or type, variance review and
   approval, then adjustment); valuation by weighted average (FIFO later); batches and expiry where the activity
   needs them (pharmacy, food).
3. **Procurement**: suppliers (vendor contacts already exist), **purchase requisitions** → approval → **RFQ**
   (optional, compare quotes) → **purchase order** (PDF, send by email or WhatsApp) → **goods receipt** (partial,
   updates stock) → **supplier bill** (to expenses and accounts payable) with 3-way match and payment.
   Supplier performance (lead time, price history, rejected items).

## Phase 6: Online store, customer accounts and payments

1. **Customer accounts** (separate from staff users): sign up and sign in on the website with email and password
   or email code, **Sign in with Google** and **Sign in with Apple** (OAuth credentials in Integrations, with
   setup guides), profile, addresses, order history, wishlist, delete-my-account. Customers link to CRM contacts.
2. **Cart and checkout**: cart, coupons, VAT from tax settings, delivery method and fee (phase 7), guest checkout
   option, order confirmation email and WhatsApp.
3. **Payment gateways**: one provider interface (create payment or session, handle the webhook, refund, check
   health) with idempotent webhooks reconciled into `Payment` and invoices. Implement **Stripe** (cards, Apple Pay,
   Google Pay), **Tap Payments** (GCC cards, BenefitPay, mada, KNET), **PayPal**, **Checkout.com**, **PayTabs**,
   **Moyasar**, **HyperPay**, plus **cash on delivery**, **bank transfer** (upload proof, existing flow) and
   **pay by invoice link**. Card data never touches our servers (hosted checkout or hosted fields only).
   Test mode for each, with a provider health check in Integrations.
4. **Orders in the admin**: order list and detail, statuses (placed, paid, packing, shipped, delivered, cancelled,
   returned), stock reservation and release, invoices and receipts generated from orders, returns and refunds
   through the gateway, and staff-created orders (phone or WhatsApp sales, simple POS screen).

## Phase 7: Delivery and logistics

1. **Delivery setup**: own fleet, outsourced agencies or both. Delivery zones with fees, minimum order, time
   slots and free-delivery thresholds.
2. **Own fleet**: drivers (employees with the driver role), vehicles, route sheets, a mobile-friendly driver view
   (today's deliveries, navigate, call, mark delivered with photo or signature, collect cash on delivery and
   settle it).
3. **Agencies**: courier partners with manual tracking numbers and an adapter interface for API couriers
   (Aramex, DHL Express, SMSA, Fetchr-style local partners), shipping labels where the API offers them, and
   agency invoices to expenses.
4. **Tracking** page for customers, delivery SLA and failed-delivery reasons.

## Phase 8: Department modules

- **Marketing**: campaigns with budget and results, coupons, customer segments, email and WhatsApp broadcasts
  through existing integrations, UTM links, and the existing social module.
- **PR and communications**: press releases (articles), media contacts list, coverage log, press kit page;
  internal communications already exist (announcements, letters, minutes).
- **Legal**: contracts register (existing `Contract`), legal matters, licences and registrations with renewal
  reminders (existing expiry reminders), NDA and template library, signatures (existing).
- **Customer service**: tickets from website, email and WhatsApp with SLA, assignment and canned replies,
  linked to orders and customers.
- **Tasks and projects**: tasks with assignees, due dates and departments, usable by every department.

## Phase 9: Reporting

Sales by product, category, channel, customer and salesperson; margin; order funnel; stock on hand, valuation,
slow and fast movers, stock-count variance; procurement spend by supplier, open POs, price changes; delivery
performance (on time, failed, cost per delivery, COD outstanding); receivables and payables aging; marketing ROI;
HR headcount by department. Every report: filters, date ranges, comparison periods, CSV, Excel and PDF export,
and scheduled email delivery.

## Phase 10: Dashboard v2

A **widget registry**: every module contributes widgets (KPI, chart, list, quick action, approvals inbox, task
list). Default layouts per role template and department; each user can add, remove, resize and reorder widgets
(saved per user); department dashboards for managers; a global search (Cmd+K) across records; an activity feed.
Widgets respect data scope.

## Phase 11: Motion polish (both apps)

Shared motion tokens; page and route transitions; staggered lists and cards; skeleton loaders instead of spinners;
hover, press and focus micro-interactions; number count-ups on KPIs; smoother modals and drawers; scroll reveals
on the website. Always honour `prefers-reduced-motion`. No layout or palette changes.

## Order and dependencies

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10, with motion polish done inside each phase's new screens and a final
pass in 11. Phase 3 and phase 5 do not depend on each other; if time is short, finish phases 1–4 (the
customization the user asked for first) before commerce.

## Decisions taken (change them if the user disagrees)

- "PR" is covered both ways: **purchase requisitions** (procurement) and **public relations** (communications).
- Custom code runs sandboxed by default; there is no "trusted inline script" mode.
- Customers are a separate account type from staff; staff sign-in is unchanged.
- Gateways and couriers get real adapters where a public sandbox exists; anything that cannot be tested without
  a merchant contract stays behind the same interface, clearly marked as "needs live credentials".

## Progress log

Kept by the implementation session on branch `claude/platform-v2-0b8ad0`. Newest entries last.

### Phase 1a: activity matrix and per-company deal pipeline (done)

- `docs/audits/ADMIN_ACTIVITY_MATRIX.md`: every admin route with the activities that need it, its module and its
  permission, plus the screens that assumed a media company and what changed.
- `DealPipelineStage` (migration `20261026100000_deal_pipeline_stages`): the company's stages, seeded with the nine
  stages in use today. **No stored deal stage changed** (the admin-wording proposal: do not rename `production` /
  `post_production`; they are now ordinary, renameable stages).
- System stages (lead, proposal sent, contract signed, invoiced, won, lost) are the ones quotations, invoices and
  payments move deals into: renameable and reorderable, not removable. Working stages come from
  `ACTIVITY_DEAL_STAGES` per activity; choosing an activity in the wizard applies them without dropping stages
  that hold deals.
- Settings → Sales pipeline (`/dashboard/settings/pipeline`, `settings:read`, edit with `settings:edit`): names per
  content language (empty = the built-in, activity-aware label), order, colour, win %, on/off, custom stages.
  The deals board, deal forms, the status filter and the dashboard pipeline panel read the company's stages.
- Forward-only auto-advance and the integrity rule "deal stage is not behind its documents" now use the
  company's stage order.
- Decision: custom stages are always "open"; only the built-in won and lost stages close a deal.

### Phase 1b: link and attachment audit (done)

- `tests/e2e/crawl.ts` with `specs/admin/links.spec.ts` and `specs/web/links.spec.ts`: a breadth-first crawler
  (two pages per route pattern) that fails on error statuses, crash and not-found pages, broken images, failed
  page requests, downloads that answer with a page or nothing, new-tab links without `rel="noreferrer"`, and, on
  the website, links without a language or into the other language. The sitemap's addresses must all answer.
- Attachments: every file the company archive lists downloads for the administrator; a visitor without a
  session gets nothing that is not public; a viewer can open exactly the files their archive lists and is refused
  the rest; files linked from client, deal, invoice, payment, expense and employee pages are in the archive.
- Found and fixed: the language switcher had no `hreflang` (now marked, so crawlers and screen readers know it
  leaves the page's language); password-reset emails pointed at port 3000 (the website) when `ADMIN_APP_URL` was
  unset, and put the person's name into the HTML unescaped.
- Test note: Playwright API contexts created inside a project inherit its signed-in `storageState`, so the
  "visitor" check passes an explicit empty session. A new disposable `viewer` account was added to
  `tests/e2e/fixtures/users.json`.

### Phase 1c: domains (done)

- `CompanySetting.websiteDomain` / `adminDomain` (migration `20261026110000_company_domains`), normalised by
  `constants/domains.ts` (host names only: no IP, port, credentials or localhost).
- Used for the website's canonical URL, sitemap and metadata (`publicSiteUrl`), and the admin's public origin
  (password reset, signing, calendar feeds, PDFs). `WEB_URL` / `ADMIN_URL` still win.
- Settings → Website and the wizard's Website step show a Domains card with the DNS records for Vercel or an
  own server and a **Check domain** button. `/api/health` on both apps answers with the app and a hash of the
  company id; the check refuses private addresses, uses https only, no redirects, 8-second timeout
  (documented in `docs/SECURITY.md` and `docs/OPERATIONS.md`).
- Emails do not link to the website today (the brand email layout's website field is unused), so nothing else
  needed changing there.

### Phase 2a–2c: departments, role templates, data scope (done)

- **Departments** (migration `20261026120000_departments_tree`): parent department, head, deputy, cost centre,
  order and on/off; staff accounts belong to a department (`User.departmentId`, filled from their employee
  record; the old free-text `User.department` stays untouched). Settings → Departments shows the tree, edits
  departments, refuses loops and only removes empty departments. The catalogue (14 departments, names in both
  languages) is offered per activity; choosing an activity in the wizard adds its departments (never removes).
  Moving an employee or a user keeps the two records in the same department.
- **Approvals**: the "department manager" step now uses the account's department, includes the deputy, skips the
  requester, and climbs to the parent department when a department has no head.
- **Role templates** (migration `20261026130000_role_templates`): 22 templates (owner, administrator,
  department manager, finance manager, accountant, HR manager and officer, sales manager and rep, marketing,
  PR officer, legal counsel, procurement officer, warehouse keeper, delivery coordinator, driver, customer
  service, operations manager, project lead, content editor, employee, viewer). `production_manager` →
  `operations_manager` and `producer` → `project_lead`: the migration copies names and grants, moves users,
  approval policy steps and calendar/announcement audiences, then removes the old ids. `LEGACY_ROLE_IDS` /
  `canonicalRoleId` map the old ids wherever they are read.
- Decision: a missing grant row still means **denied** (the existing rule). `ensureRoleTemplates` stores the
  template default for any grant a template role is missing (new templates, resources added later), once per
  server process and on the Roles and Users pages; stored grants are never overwritten.
- **Data scope** (migration `20261026140000_role_data_scope`): per role and area (deals, requests, expenses,
  claims, leave): own, department (with sub-departments) or all, chosen in the role editor. Applied to the deals
  board and export, deal page and deal changes, the request inbox, counters, export, request page and actions,
  the expenses list and export, the finance claims view, and HR requests (leave and claims).
- Decision: roles that existed before data scopes (sales, project lead, finance…) default to **all**, so
  nothing changes for existing companies; the new department-manager, employee and driver templates default to
  department or own. Records without an owner (an unassigned request, a deal without an owner) are visible only
  to "all" scopes, so someone with a wider scope triages them.
- Fixed a pre-existing check failure: `check-followup-db` loaded `actions/website.ts` without a mock for
  `lib/public-paths`.

### Phase 2d: people at scale (done)

- Users: server-side search (name, email, phone, Arabic name, employee number), filters (role, department,
  status) and 50-row pages; select accounts and change their role or department in bulk
  (`bulkUpdateUsersAction`, the same guard as editing one account: no Super Admins, never a role above the
  actor's own). Manager pickers read a light list of active accounts instead of the page.
- Directory: searched and paged (48) on the server; the department filter includes sub-departments. People also
  appear in the global search (Cmd+K) for everyone, with role badges in words; the deals in that search now follow
  the data scope.
- Org chart (`/dashboard/directory/org`): the department tree with head, deputy, a few people and a link to the
  rest; collapsible, reduced-motion safe.
- Import (`/dashboard/hr/employees/import`): CSV (comma or semicolon, quoted cells, BOM) with a downloadable
  template, a preview of every row's problems (names, titles, dates, salary and payroll access, department codes,
  emails used or repeated, roles the importer may give, managers), then import of the ready rows: employee
  records and, where a role is given, accounts (random password; people use "Forgot password"), managers linked
  last. Up to 2,000 rows; the two import actions may carry up to 900 kB (`PAYLOAD_LIMITS` in `action-input.ts`).
- Indexes for list order and filters (migration `20261026150000_list_indexes`).
- `pnpm test:volume` (`scripts/check-volume.cjs`): 2,000 employees, 1,500 accounts, 35 nested departments and
  50,000 records; 14 lists timed against 1.5 s each. Local run: every list under 40 ms.
- Fixed while here: my first pipeline migration gave `DealPipelineStage.updatedAt` a database default that the
  Prisma schema does not declare (schema drift); corrected in that unreleased migration.

### Phase 3: CMS v2 (done)

- **Pages** (`CmsPage`, migration `20261026160000_cms_pages_articles`): slug, titles, SEO, page type, order,
  shown/hidden, header and footer menu flags, and ordered **blocks** (`packages/database/src/cms/blocks.ts`):
  hero (three styles), about, text, image and text, gallery, video, catalogue, services, figures, testimonials,
  FAQ, client logos, call to action, contact details and form, map, team, latest articles, columns, space,
  divider, custom code, embed, leader's message, values, equipment. Data blocks show content managed elsewhere;
  content blocks hold their own text per content language.
- The homepage, About and Contact become pages the first time pages are needed (`ensureCmsPages`), built from the
  current settings: same sections, order and visibility, content still read from the same tables. Websites
  published before pages existed keep the old fixed layout until they are published again.
- Website → Pages: reorder, show/hide, menu flags, copy, remove (built-in pages can only be hidden), new pages;
  page editor with add/reorder/copy/hide/remove blocks and a signed draft preview of that exact page.
- **Menus** (Website → Menus): header and footer links to pages, the catalogue, the articles or other websites,
  with the company's own wording; until edited, menus follow the pages' flags. The articles address and name are
  set here (default per activity: news, blog for products and food, insights for agencies).
- **Articles** (`CmsArticle`): category (news, update, post, press release), tags, author, cover, excerpt,
  publish date and scheduling, featured, SEO. Writers save drafts; `articles:approve` publishes. Website:
  `/{locale}/{articles}` with category filter, article page with share links (X, LinkedIn, WhatsApp, copy),
  RSS at `/{locale}/{articles}/rss.xml`, the "latest articles" block, sitemap entries. Scheduled articles stay
  hidden until their time (shown in preview).
- **Editor**: TipTap 3.31.4 (admin only): headings, bold/italic/underline/strike, links, alignment, right-to-left
  or left-to-right per paragraph, lists, quotes, tables, images with captions (normal upload flow), galleries,
  YouTube/Vimeo, embeds; paste from Word or Google Docs is cleaned. Documents are stored as JSON; the website HTML
  is rendered and sanitized on the server.
- **Custom code and tracking**: code blocks and site-wide head/body code in sandboxed frames; analytics as
  validated ids (Google Analytics, Meta Pixel, TikTok Pixel); new permission resources `pages`, `articles` and
  `cms_code` (owner/administrator get `cms_code`); audit-logged; documented in `docs/SECURITY.md`.
- Decisions: (1) site-wide "code in head" cannot run on the page itself under the sandbox-only rule, so analytics
  are offered as id-based presets and free-form code is sandboxed; (2) the website HTML is rendered by a small
  renderer for the editor's node set instead of `@tiptap/static-renderer`, which broke inside Next's
  server-action bundle; (3) TipTap's JSON has prototype-less objects that server actions refuse, so the editor
  sends a plain copy.
- Found while testing: the link crawler's earlier report (five admin links opening new tabs without
  `rel="noreferrer"`) and the wizard's second `h2` were fixed in a separate commit.

### Phase 4a: more activities, more styles, a light website (done)

- 12 new activities in `ACTIVITY_PRESETS` (online store, beauty and salon, fitness, automotive, logistics,
  travel, hotel, law firm, nonprofit, pharmacy, manufacturing, IT and software), 23 in all, each with its catalogue
  address and layout, homepage sections, enquiry questions, modules, suggested style, pipeline stages
  (`ACTIVITY_DEAL_STAGES`), departments (`ACTIVITY_DEPARTMENTS`), articles name and website wording in both
  languages (`website-activities.json`), and a wizard card.
- 22 style presets (14 new), several with a **light website**: `BrandTheme.websiteMode` ("dark" | "light").
  The website's foreground is a token (`white` → `--site-fg`), so layouts are unchanged; text on brand colours
  and over photos keeps real white (`text-paper`, `.on-media`); the logo and icon made for the background are
  chosen automatically; white client logos show as dark silhouettes on a light website. The theme editor has
  "Website background" and the style gallery shows each style's background.
- Fixed while here: a hydration mismatch in the block homepage (a server component that rendered nothing inside
  a fragment shifted the client logo strip's generated id).

### Phase 4b: sample content and example websites (done)

- Samples for all 23 activities (`packages/database/src/samples/activity-samples.ts`): a banner, four catalogue
  items (with prices where the catalogue shows them), three services, three figures, three common questions and a
  welcome article, written in both languages. Pictures are drawn by the website in the company's own colours
  (`/api/samples/*.svg`), so no stock images ship with the platform.
- `isSample` on banners, catalogue items, services, questions, figures and articles (migration
  `20261026170000_sample_content`). **Start with sample content** in the wizard's website step fills them; the
  Website page shows how many samples are left with **Remove sample content** (only samples are deleted) or
  **Add sample content**. Adding twice replaces the earlier samples.
- **Show an example** (wizard website step and Website page) opens the demo website of the activity: a signed,
  ten-minute preview link whose activity is part of the signature; the website builds the snapshot in memory from
  the samples (`exampleSnapshot`) and labels the page "Example website". Nothing is saved.
- Decision: the example uses the company's current colours and logo (the style gallery already previews
  styles); a per-style example can come with the wizard's live preview in 4c.
