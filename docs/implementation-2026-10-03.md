# First implementation pass — 3 October 2026

Implemented the audit's initial security/correctness work and a small set of CRM/website improvements. No production deployment or database schema/data changes were performed.

## Changes

- Stored sessions are checked on authenticated requests; deleted/expired/inactive sessions fail. Production JWT secrets are required, login tokens have unique IDs, and revoked cookies no longer cause a middleware login redirect loop. Permission lookup fails closed during database errors.
- Customer/deal dossiers filter related records by resource permission. Invoice list totals use the already fetched invoice records rather than another full-company finance query.
- Admin resource pages, social-link/module actions, global search and attachment actions have server authorization. Dashboard data is filtered by resource permission; archive currently requires read permission for all included resource classes. Notification actions use the current user and check notification ownership. Topbar no longer fetches/transmits every customer or financial company fields.
- PDF access requires authentication and the corresponding financial resource permission. Upload authentication runs before multipart parsing; entity permissions, supported types, 10 MB size, magic bytes and generated filenames protect storage. Confidential uploads use private directories and authorized file downloads. Legacy non-brand upload URLs are rewritten through the authorized handler. Only verified logo/icon images are public; stamps and signatures remain private.
- Invoice edits lock the invoice, preserve stored VAT, and replace line items within one transaction. Paid/void invoices cannot be edited. Paid invoices cannot be voided through the status action. Invoice/receipt counters use atomic increments; financial operations require preconfigured company settings. Shared totals validate currencies, quantities, prices, discounts and rates.
- Payment creation locks the invoice and rejects invalid amounts/methods, mismatched currencies, void invoices and overpayment. It stores the invoice's currency. Removing a payment preserves a void state.
- Lead intake creates customer and inquiry atomically with PostgreSQL identity locks. Manual contact create/edit maintains normalized identities. Invalid phone numbers are rejected. Website conversion no longer mistakes a resolved customer for a converted inquiry; row locking plus recorded conversion metadata makes repeat calls reuse the deal. Conflicted identities require resolution. Comma-separated budgets parse correctly.
- Financial reporting now explicitly includes BHD records rather than adding different currencies. Overdue balances derive from dates, void invoices are excluded, and cash VAT is a proportional internal estimate. The finance chart uses actual monthly data instead of fabricated percentages. Full multicurrency reporting and tax reporting are still separate work.
- Public submission/login fields receive runtime checks. Missing production email configuration does not report mock success; inquiry responses expose confirmation delivery state. Public company props remove bank details, certificates, stamps and signatures.
- Publishing invalidation expands to both languages; HTTP failures are logged. Public database pages render dynamically to avoid caching empty content during a build without database access. Added bilingual portfolio sitemap, robots endpoint and metadata base URL.
- Deal edit now supports active-user ownership and a required lost reason. Failed updates show a bilingual error. Calendar range queries include events spanning the whole range and correctly handle upcoming-only queries.
- Next.js upgraded from 15.1.7 to 15.5.27. Scoped next>postcss override pins 8.5.23. Installation scripts were disabled. Runtime dependency audit reports zero known vulnerabilities.

## Checks and limits

`pnpm test:platform` runs focused source-module checks with mocked boundaries for revocation, denied writes, rejected anonymous upload, invalid inquiry payloads, invoice rollback/VAT, payment validation, repeat conversion/conflicts, and BHD/overdue/VAT reporting. These are not live PostgreSQL concurrency tests.

TypeScript checks and production builds passed for both apps. Final builds used NEXT_DIST_DIR=.next-verify to avoid collisions with existing development servers. Live HTTP smoke checks returned 401 for anonymous upload, PDF and legacy financial-file requests. The first web build exposed an unavailable local PostgreSQL server; dynamic rendering prevents that failure being baked into the generated website. Live database reads/writes, restored backups, browser walkthroughs, and simultaneous database transaction behavior remain unverified until a test database is running.

Private files still need a persistent disk/volume on the deployment host; local storage is not durable on ephemeral or multi-instance hosting. Legacy logos stored outside the public brand directory now require authentication and should be reviewed/migrated before deployment. Existing duplicate/stale identity records have not been backfilled. Conversion currently stores its inquiry/deal link in audit metadata; add a dedicated relation before pruning audit history.

## Remaining roadmap

- Measured query optimization, pagination, smaller financial projections and database aggregate reporting.
- Follow-up tasks/reminders, duplicate review/merge, reviewed import/export and attribution.
- Quotes/revisions/acceptance, milestone billing, credit/refund workflows and project profitability.
- CMS drafts/previews/revisions, scheduled publishing, per-page SEO editing, redirects and media library.
- Shared abuse throttling, durable email delivery/retry state, atomic audit coverage, migration baseline, restore verification and production readiness.

These are recorded as remaining work, not represented as shipped features.
