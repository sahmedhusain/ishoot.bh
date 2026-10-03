# Website and dashboard enhancement delivery

3 October 2026. Implemented in the working tree; not deployed to production.

## Delivered

- Mixed dark and warm-light website sections, refined typography, database-backed public services, featured portfolio, static client logo grid, reviews, FAQ and a redesigned bilingual contact page.
- Hero CTA destinations and posters, meaningful fallback content, pause controls, reduced-motion handling and offscreen video pause. Corrected smooth-scroll cleanup. Native project/mobile-menu dialogs, focus restoration, labelled controls, skip link and accessible form feedback. Restored film credits and added “All work” filtering.
- Contact paths for inquiries, quotation requests, complaints, suggestions and ratings/reviews. Relevant quote fields, explicit service selections and rating, anonymous suggestions, bounded input, honeypot and a process-local abuse guard.
- Persistent references, retry idempotency, real notification state and original review language. Reviews await moderation. Public review projections exclude private customer data. Support feedback does not create sales contacts; complaints require support permission and are excluded from ordinary customer dossiers.
- Dashboard requests inbox with pagination, per-page filters, ownership, priorities, support statuses and private notes. Sales conversion remains limited to sales requests.
- Website publishing editor in the dashboard navigation: section ordering/visibility, bilingual contact copy, public service selection, draft save, expiring signed preview, publication and previous-publication restore. Revision checks protect configuration updates. Hero, portfolio, logos, FAQ, statistics and service content are captured in published snapshots. Incomplete source reads cannot create a publication.
- Existing banners and projects can now be edited, including CTA/media, descriptions, gallery and ordering. Failed update/delete operations no longer appear successful. Company settings and review moderation remain immediate, as described in the editor.

## Verification completed

- `pnpm type-check` and `pnpm test:platform`.
- Web and admin production builds, with separate `.next-verify` output.
- `scripts/check-website.cjs` against isolated PostgreSQL: concurrent duplicate handling, identity linking, support isolation, complaint privacy, notification mapping, public review projection and draft isolation.
- `scripts/check-website-http.cjs` against the matching local server/database: all five contact paths, retries, invalid input, review moderation and disabled-email reporting.
- Migration rehearsal on a populated disposable baseline database: legacy message, status and CRM merge flag survive; stable reference and default intent are populated.
- Browser: English and Arabic public pages; complaint submission → protected inbox → assignment/status; saved draft remains separate from public content; signed preview; publication; previous-publication restore; banner and project edits persist; category reset, project-dialog Escape dismissal and trigger focus restoration.
- Desktop contact screenshot: `previews/contact-desktop.jpg`.

The in-app browser ignored its requested 390px viewport and continued reporting 1280px. Responsive CSS is implemented, but mobile visual verification remains outstanding. Real-device keyboard/reduced-motion and slow-network checks, production query plans and field Core Web Vitals have not been measured. Passing builds do not establish production performance.

## Production rollout

1. Back up the database and compare the deployed schema with the baseline migration. This repository previously had no migration history; existing databases may have been created with `db push`.
2. For an existing matching schema, reconcile any drift first, then mark `20261003000000_baseline` applied with Prisma's `migrate resolve --applied`. Do not execute the baseline CREATE statements over existing tables. For a genuinely empty database, deploy both migrations normally.
3. Deploy the additive `20261003010000_website_contact` migration with `prisma migrate deploy --schema=packages/database/prisma/schema.prisma`. Do not use a reset or production `db push`.
4. Deploy both apps. Configure matching `REVALIDATION_SECRET`, the public `WEB_URL`, the real email provider credentials and staff notification address. Confirm company contact details, business hours, real imagery and service descriptions.
5. Open Website publishing. Existing public collections are captured as an initial snapshot. Services default to private to avoid exposing the internal billing catalogue: explicitly choose the public services, preview, then publish. Reviews and company profile changes remain immediate.
6. Smoke-test each form, staff permissions, preview/publish/restore and email-provider acceptance. Current `sent` status means provider acceptance, not proof of inbox delivery.

No production database migration, deployment or real email was performed. Preview fixtures and credentials belong exclusively to disposable local test databases; do not seed them in production.

## Remaining priorities

- Shared abuse protection for multi-instance hosting; the included in-memory limiter is per process.
- Durable notification retries/outbox and provider delivery webhooks. Saved requests survive email failure, but automatic retry is not yet implemented.
- Dedicated public media upload/storage policy and optional inquiry attachments; editors currently accept media URLs.
- Full CMS editing for remaining static About/mission/team copy, richer SEO controls and full content revision history. This delivery stages the listed collections and contact content, with one prior publication available for restore.
- Global inbox search/filtering and larger collection pagination when volume requires them. Current inbox filters apply to the current 50-record page.
- CRM SLA reminders, follow-up automation and expanded quotation workflows after their business rules are defined.

## Skills used

Redesign existing projects, motion design and frontend UI engineering guided the implementation. Existing Next.js, Tailwind, Framer Motion, Lenis and Prisma were reused; no replacement CMS or additional animation library was introduced.
