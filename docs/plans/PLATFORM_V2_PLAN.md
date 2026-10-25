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
