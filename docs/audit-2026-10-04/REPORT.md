# Repository audit — October 4, 2026

## Outcome

Audited the complete application/shared-package source, scripts, manifests, migration history, public assets, local storage footprint and existing Graphify relationships. The initial Graphify graph contained 2,220 nodes; source and executable checks were authoritative for removals. The graph was not regenerated after cleanup.

The inventory contains 322 TypeScript source files, 21 HTTP handlers, 85 server actions, and 50 Prisma models. See `INVENTORY.md` and `inventory.json`. Counts exclude dependencies, Next build output and generated Prisma code.

## Fixed

- All seven workspaces now expose type checks, rather than checking only the two applications. Shared packages explicitly target ES2022 with bundler resolution and declare required Node types. Strict TypeScript remains enabled, and unused local declarations now fail compilation.
- Removed unused imports, local bindings, uncalled actions, dormant form fragments and an orphaned quotation PDF renderer. Kept calls that enforce authorization even when their return values were unused. Framework positional parameters and optional component props remain API contracts; `noUnusedParameters` is not enabled.
- Removed the unused bcrypt type stub, duplicate admin Prisma dependency, unused email database dependency and unused web UI dependency. Recharts 2 migrated to 3.10.1; direct ESLint CLI replaces deprecated `next lint`; flat lint configuration replaces the legacy configuration.
- Added reproducible `pnpm audit:unused` (Knip) and CI checks. Its explicit exceptions are Prisma's generated-runtime dependency, the Next ESLint configuration loaded through FlatCompat, and meeting actions exercised through the VM-based regression harness. Operational scripts are entry points. The scanner is evidence of static reachability, not a guarantee about external consumers.
- Fixed two forms calling the removed multipart endpoint. Signed upload initialization validates fields and accepted MIME keys, finalization rechecks target permission, verifies stored size/type, and atomically claims the upload. Regression checks cover invalid metadata, denied targets and repeated claims.
- Private/public cloud file readers now issue short-lived signed redirects after authorization. Metadata verification uses the object info endpoint rather than downloading the whole file. Storage requests have a finite timeout.
- Both cron and standalone maintenance share the same bounded cloud deletion logic. Storage deletion failures preserve the database records. The cron route rejects requests when its secret is missing.
- Corrected PDF storage bucket/path resolution. Bundled SVG and uploaded WebP images are converted to PDF-supported PNGs within pixel bounds; unresolved local URLs are not passed through as nonexistent filesystem paths.
- Resend delivery events now require valid Svix signatures and replay timestamps; event IDs deduplicate retries under a per-message database lock. Stored delivery logs are bounded. Removed the unimplemented inbound-email stub; inbound ingestion remains unsupported.
- Removed the hardcoded integration encryption-key fallback from both writers and readers. Integration writes use the settings permission boundary and runtime validation. Saved credentials now show an unverified connection rather than a simulated healthy connection.
- Added the missing additive migration for eight declared tables: IntegrationSetting, AuthChallenge, Quotation, QuotationLineItem, CommunicationThread, CommunicationMessage, MessageAttachment and SocialMetric. Disposable migration/schema comparison is now empty. Existing installations created through `db push` may already contain these tables; inspect migration history before deploying this migration there.
- Removed credential-shaped values from the tracked environment example. It was byte-identical to the local `.env` at audit start. No local environment values or Git history were rewritten. If those committed values were real credentials, rotate them; editing the current example does not remove historical exposure.
- Replaced unsupported deployment-readiness and retention claims with verified implementation status.

## Verification

- `pnpm lint`: zero errors or warnings.
- TypeScript: all seven workspaces pass with strict mode and unused-local checking.
- `pnpm audit:unused`: no unused files, dependencies or exports reported after the documented entry points/exceptions. Knip notes that Prisma schema imports are not followed.
- `pnpm test:platform`, `pnpm test:audit-security`, `pnpm test:action-schemas`, `pnpm test:uploads`: pass.
- Prisma migrations applied to a fresh disposable PostgreSQL 15 database; schema drift check returns an empty migration.
- `test:audit-db`, `test:followup-db`, `test:open-items-db`, and `scripts/check-website.cjs`: pass against that database. Coverage includes transaction rollback, permissions, financial parity, concurrency/idempotency, pagination across 505 rows, MFA and retry queues.
- HTTP checks: actual login/logout, PDF export and export denial, calendar authorization, public cache invalidation, signed preview isolation, five submission paths, replay handling, review moderation and disabled-email behavior pass against isolated local builds. Website checks required published preview fixtures; initial attempts on an unpublished empty fixture database returned the expected setup error.
- No real email was sent and no configured customer database was modified. Temporary servers and PostgreSQL fixtures were removed after verification.

## Performance and storage evidence

`local-http-profile.json` records ten warmed serial samples and a four-request burst for each of eight routes. This used a small local fixture dataset, with no production-network latency or browser measurements. Warm medians were 10.14–14.44 ms; the largest sampled route maximum was 65.9 ms. HTML responses were approximately 44–59 kB. These numbers are diagnostic baselines, not production p95 or Core Web Vitals certification.

The existing financial-summary integration benchmark confirmed identical results using 1,004 invoices, 1,003 payments, 1,002 expenses and 2,000 line items. Its historical algorithm median was 161.79 ms versus 10.08 ms for the current aggregate implementation, with source serialization reduced from 3,322,088 bytes to zero. This validates an optimization already present before this audit, not a new speedup from import cleanup.

The first production build reported public homepage first-load JS of 231 kB, about/contact/works of 221/213/220 kB, shared public JS of 102 kB, and admin dashboard JS of 184 kB. The public homepage exceeds the performance skill's suggested 200 kB budget. Heavy charts and the icon picker already use deferred loading. A browser trace and representative-device LCP/INP measurements are needed before further animation/image changes. Many public remote images bypass Next optimization to support CMS URLs; admin images deliberately bypass optimization for authenticated content.

Before cleanup: node_modules about 2.2 GiB, existing Next outputs about 773 MiB, generated Prisma code about 158 MiB, Git data about 269 MiB, raw design assets about 59 MiB, public assets about 17 MiB and Graphify about 8.7 MiB. Dependency reinstall reduced node_modules to about 718 MiB. During verification, cached/duplicate builds accumulated; `pnpm clean` removed 6,479.1 MiB of regenerable output, including Turbo caches, then final production output was rebuilt with archive-cache writes disabled. `clean` no longer relies on an undeclared, deprecated rimraf binary.

`largest-tracked-files.json` records asset/source storage candidates. Original design assets, database data, uploads, configured branding paths, dependencies needed at runtime and Git history were preserved. An unreferenced public asset cannot safely be declared unused merely from import scanning: CMS/database fields may refer to its URL.

## Remaining findings

1. **Dependency advisory:** braces 3.0.3 is reached through Tailwind/Next lint tooling. The registry audit reports one high-severity nested-pattern stack-exhaustion advisory, with no published patched version. Project globs are developer-controlled; no application route was found passing visitor-supplied patterns to braces. Do not claim a clean vulnerability scan. Monitor [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and update when a compatible patch is published. See `dependency-advisories.json`.
2. **Deprecated toolchain:** ESLint 9.39.5 itself is now deprecated. It is the newest compatible major accepted by this Next 15 ESLint configuration. ESLint 10 and Next 16 need a coordinated migration; installing an unsupported peer just to silence deprecation would weaken the verified configuration. Recharts and the old ESLint 8 transitive deprecations were removed. Other newer major versions exist for Next, Prisma, TypeScript, Tailwind, motion, icons and Resend; newer does not automatically mean deprecated or safe to upgrade without migration work.
3. **Environment readiness:** current `check:deployment` fails eight checks: pool connection limit, pool timeout, MFA key, server Supabase URL, integration encryption key, cron secret, Resend webhook secret and mail configuration. Secrets were not invented or installed. The Supabase service key remains server-only. Real bucket limits/access policies, provider quotas, scheduler delivery, regional latency, backups and restore remain unverified.
4. **Retention/storage growth:** claimed-file orphan reconciliation, 30-day successful email payload cleanup, 90-day analytics aggregation and expired unclaimed public-brand cleanup are not implemented. Retention documentation now distinguishes policy targets from implemented sweeps. Financial/audit evidence was not deleted.
5. **Query growth:** 71 `findMany` calls, 45 without an explicit literal `take`. This syntactic count includes fixed CMS collections, exports, parameterized paging and intentional complete mappings; it is not 45 proven bottlenecks. Calendar feed/range limits, contact identity reconciliation and growing CMS collections warrant realistic-size profiling. Do not add silent record limits to complete exports or finance calculations. No speculative indexes were added.
6. **Product completeness:** integration credentials can be saved, but provider connectivity is not verified. Quotation models remain available, but uncalled quotation actions/PDF fragments did not constitute a functioning quotation route. Implementing those features and inbound email ingestion is separate from repository hygiene.

Primary references: [Next lint deprecation](https://nextjs.org/blog/next-15-5), [Recharts migration](https://github.com/recharts/recharts/wiki/3.0-migration-guide), [Supabase bucket limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [Resend webhook verification](https://github.com/resend/resend-skills/blob/main/skills/resend/references/webhooks.md).

Largest tracked asset: `apps/web/public/banners/web-banner-01.png` is 8,725,620 bytes (~8.32 MiB); several JPEG covers are roughly 0.56–0.97 MB. Local images use Next optimization, but source storage and cold transformation costs remain. Preserve CMS URLs when optimizing these assets, and measure visual fidelity and LCP before changing formats or quality.

Final production rebuild passed for both apps in 59.928 seconds with no archive cache reads/writes. Its admin dashboard remained approximately 184 kB first-load JS. PDF SVG conversion is covered by a real Sharp conversion test on the bundled wordmark. Final lint, all seven uncached type checks, action schemas, static unused-code scan and regression checks pass.

## Follow-up: local initialization and seed runtime

The original verification did not execute the standalone demo seed. Its inherited ES module configuration caused Node to reject the generated Prisma directory import. A dedicated CommonJS seed configuration now runs through both root and database workspace commands, and the database type-check includes that configuration. Three stale inquiry intents were corrected to the supported quote_request value.

A complete fresh PostgreSQL 15 demo seed passed with all migrations present at that verification point. A rerun refused existing business data and left users, invoices, payments and inquiries unchanged. The seed refuses production and nonempty business/CMS databases, and validates administrator credentials. Database/seed type checks, ESLint, Knip, upload checks and platform checks passed.

The local Supabase stack was initialized and started at database port 54322/API port 54321. Existing migrations were deployed to its empty database. Its public-assets/private-assets buckets were provisioned, and a signed upload, metadata check and signed download passed; the test object was removed. Local environment endpoints and missing app secrets were configured without printing credentials. The disposable verification database was removed; local Supabase remains running.

Supabase default Data API grants exposed server-only application tables to anon/authenticated roles. A conditional migration revokes those grants and future default table grants, and local configuration disables automatic exposure of newly created tables. Verification confirmed anonymous Invoice reads and authenticated User reads are denied while Prisma remains connected. The service_role storage access remains available.

The local application database is migrated but has not been bootstrapped or demo seeded because SUPER_ADMIN_PASSWORD is blank. Set that value locally before running either command. README/DevOps instructions now distinguish non-destructive bootstrap from empty-database demo seeding and provide commands that can be pasted into interactive zsh.
