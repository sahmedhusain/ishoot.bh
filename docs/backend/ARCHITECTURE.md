# Backend architecture

```
Browser ─▶ apps/web · apps/admin · apps/it   (Next.js: UI, cookies, server components, thin server actions)
                │ server side only: Bearer token + X-Request-ID, generated TypeScript client
                ▼
            gateway ── routing · token check (JWKS) · rate limits (Valkey) · tracing
                ▼
  identity · system · files · notify · realtime · audit · workflow · cms · sales · finance · hr · inventory · commerce · delivery · itsm
        │ pgx + sqlc                     │ outbox → NATS JetStream          │ River jobs
        ▼                                ▼                                   ▼
  PostgreSQL 17 (one schema + role per service)    Valkey    S3-compatible storage    OpenTelemetry → Prometheus · Loki · Tempo · Grafana
```

## Principles

The system architecture is governed by the core principles detailed in [Architecture & Principles](../ARCHITECTURE.md#architectural-decisions--core-principles):
- **One service per business domain.** Each service owns its tables in its own PostgreSQL schema and connects with its own database role. No service reads another's tables.
- **APIs for questions, events for facts.** Synchronous reads use the owning service's HTTP API, described by OpenAPI 3.1. Changes other services must react to are events, written to an outbox in the same transaction and published to NATS JetStream. Background work runs as River jobs.
- **The front ends keep their look.** The Next.js apps keep their pages, components and styles. Only their data access changes, from legacy LegacyDB to the generated typed API client.
- **Configuration, not code.** See [CONFIG](CONFIG.md) and the shared business catalogue.

## Migration status

| Phase | Scope                                                                                 | Status       |
| ----- | ------------------------------------------------------------------------------------- | ------------ |
| 1     | Shared kit, catalogue, gateway, local stack, CI, Helm, docs                           | **Done**; chart validation complete |
| 2     | `files` on S3-compatible storage; Supabase removed                                    | **Done**; S3-compatible files active |
| 3     | `identity` (staff, customer and IT realms)                                            | **Implemented**; cutover pending final verification phase |
| 4     | `system`, `audit`, `notify` and the IT dashboard (`apps/it`)                          | **Implemented**; all IT dashboard operational views active |
| 5     | `itsm` and IT support in the admin app                                                | **Implemented**; desk, queues, tickets, attachments, SLA River jobs active |
| 6     | Domain waves: cms → sales → finance → workflow → hr → inventory → commerce → delivery | **Implemented**; all 8 Go services, schemas, OpenAPI, clients, events, and handoffs created |
| 7     | Retire LegacyDB, the cron route and the Node workers                                    | **Implemented**; River jobs active, legacy workers and CRON_SECRET retired |

What exists today (2026-11-02): identity runs the IT realm with mandatory MFA. Staff identity sign-in and own-account security are being integrated in the admin app; customer backend authentication is being implemented. These changes have not completed cutover verification. The system service owns modules, integrations, and the website's domains and site-wide code, all managed
from the IT dashboard, and publishes its changes as events (transactional outbox to NATS JetStream). `itsm` holds IT tickets with SLAs; employees raise them from the admin. Each service signs in
as its own database login behind PgBouncer. The audit service records every event for the IT dashboard's audit
trail, and notify delivers every e-mail and WhatsApp message. notify also keeps every in-app notification with each
person's settings, and the realtime service pushes live updates and statuses to the admin and IT dashboards over
Server-Sent Events. Broadcasts and the remaining IT
pages are not built yet, and no business domain has moved.

### Verification follow-up (2026-11-02)

- Removed the legacy email worker's Resend credential gate: notify owns delivery, including local SMTP.
  `tests/unit/email-integration.test.ts` passes (5 tests); `node --check scripts/email-worker.cjs` passes.
- Helm 3.17.1 strict lint and template rendering pass for default, staging and production values.
  kubeconform 0.6.7 validates 49 resources in each render, with zero errors; seven ServiceMonitor custom
  resources are skipped because their schemas are not bundled. This is schema validation, not a cluster smoke test.
- Removed the empty admin integrations settings directory (empty directories are not tracked by Git).
- The IT e2e server now builds before listening (CI uses its prebuilt production output), with startup regression
  tests covering failed builds. The desk journey passes against `platform-verify` (23.5 s; 2 min including startup).
  `go vet ./...`, `make lint`, `make gen-check` and `go test -race ./...` pass. The IT build still loads LegacyDB through
  integration helpers; removing those calls requires their service replacements, and remains open.
- Frontend unit/static checks (327 tests), lint, every app/package type-check and action-schema checks pass.
  Removed 924 ignored sync copies and 16 `.DS_Store` files, preserving `.agents` and `graphify-out`.
- The full disposable-stack milestone suite and subsequent migration waves remain pending.
  No development database, Compose project or environment values were changed for these checks.

Until a domain moves, the Next.js apps keep using `packages/database` (LegacyDB) for it, as described in
[../ARCHITECTURE.md](../ARCHITECTURE.md).

### Identity audit and offline recovery (2026-11-02)

Phase 3 remains **In progress**. Bootstrap, session login/rotation/revocation and MFA changes now write ID-only
events to identity's transactional outbox; its worker publishes them to JetStream for audit. Offline `recover-it`
replaces credentials only for an existing active IT administrator, preserves their ID/roles and revokes every
session. It requires an operator ID and cannot create, reactivate or promote an account. See the
[recovery runbook](OPERATIONS.md#it-administrator-recovery).

Evidence: Go vet, lint and the full race suite pass; recovery tests verify rollback on audit failure, invalid old
credentials, replacement recovery codes, session revocation and every emitted event's JSON Schema. A rehearsal on
`platform-verify` confirmed old access/refresh/password rejection, successful new MFA login and the operator event
in audit; all 19 running containers are healthy. Helm lint/render/schema checks pass for default/staging/production
values (49 valid resources each, seven ServiceMonitors skipped). Frontend unit/static checks (327 tests) and lint
pass. The IT journey passes in 11.2 s after fixing a navigation race: the overview and queue both show the same
ticket links, so the spec now waits for the queue URL and heading before opening a ticket. IT type-check and
action-schema checks pass. Staff/customer sign-in, access handoff and the later domain waves remain unfinished.
No production/development data or environment values were changed. Real-data migration/restore, image scans, load
tests and a cluster smoke deployment are not verified by this milestone.

### IT account management (2026-11-02)

`/it-accounts` now lists, creates, changes roles and deactivates IT accounts through identity's OpenAPI contract.
Creation shows a fresh authenticator and recovery codes once; the UI reads the password minimum from the service.
The owning service rechecks a locked live account, role, MFA and session for each action. Every access change
revokes sessions and records its IT actor transactionally. Serialized changes retain at least one active,
MFA-enrolled administrator, including during concurrent requests. IT data was already identity-owned; no legacy
table migration is needed for this page.

Evidence: the full Go vet/race suite and lint pass; HTTP tests validate every response against OpenAPI and cover
realm/permission refusals, stale sessions, mandatory MFA login, paging, password policy, audit-failure rollback,
session revocation and concurrent last-admin protection. All 327 frontend unit/static tests, lint, app/package
type-checks and action schemas pass. The expanded IT Playwright journey passes in 15.2 s, including both roles,
fresh MFA login, hidden/forbidden account management for engineers, deactivation and live gateway revocation.
The generated API reference now links to all six Go OpenAPI documents (the gateway owns routing configuration).
Seven new catalogue sync copies were reviewed as identical and removed after they appeared during generation.

Phase 3 is still in progress: staff/customer auth and access handoff are not cut over. IT integration helpers still
load LegacyDB. Company settings, operations pages, audit/notify completion, business services and legacy retirement
remain open.

### Security follow-up (2026-11-02)

Audit/notify paging now parses bounded 32-bit input before conversion and compares page lengths without narrowing.
HTTP tests cover zero, oversized and out-of-range limits. Go vet, lint, the full race suite and `make sec` pass;
the six checked-conversion findings are resolved. `golang.org/x/net` is updated to 0.62.0. `make vuln` reports zero
vulnerabilities in called code or imported packages; one advisory remains in the unused OpenPGP module package.

Next.js is patched to 15.5.28, sanitize-html to 2.18.1 and Vitest to 4.1.12, with compatible transitive updates.
All 327 frontend unit/static tests, lint and app/package type-checks pass. The expanded IT browser journey passes
on the rebuilt isolated stack (16.7 s). The broader browser run exposed separate calendar and test defects under
investigation; it is not yet green. `npm audit` now reports one moderate minimatch advisory in lint tooling,
with no high/critical findings. A breaking minimatch override has not been applied. Image scans, k6 load baselines
and a Kubernetes smoke deployment remain pending.

### Identity snapshot restore (2026-11-02)

A read-only clone of an offline developer volume supplied a disposable public-schema copy. Identity imported
23 staff and 24 customer authentication records, validated an unchanged rerun, then validated another rerun after
dumping/restoring the migrated copy into a second disposable database. Both reruns inserted zero rows. Migration,
import and the second restore took 38 seconds after the initial source restore; full platform/bucket recovery and
real-data MFA remain unverified. Protected archives were deleted after verification. See the
[rehearsal record](IDENTITY-MIGRATION.md#recorded-snapshot-rehearsal-2026-11-02).

First-account bootstrap now requires `it_admin`, maintaining the administration access guaranteed by the new
last-admin checks. The Go identity race suite, vet, lint and security scan pass, including restricted-role refusal.
This remains a preview snapshot: staff/customer apps, access grants, invitations and OAuth are not cut over, and
all import/restore tools are retained. Developer volumes and environment values were not changed.

The extended snapshot now preserves roles, grants/denials, overrides and role data scopes. On the same disposable
copy, it imported 22 roles, 11,132 grants and 23 staff access records; SQL comparisons and a second restore/rerun
confirmed storage parity. Unchanged reruns write nothing, and changed imports require an operator ID and an atomic
audit event. Go fixtures cover nonempty scopes/overrides, malformed access, target conflicts and audit rollback.
Staff authorization integration and the staff/customer app cutover remain pending.

### Production frontend regression checks (2026-11-02)

Production builds exposed competing client refreshes after server actions, a requisition submission that navigated
before completion, masked stock/product validation messages, and mobile header overflow. The affected views now
use the server action's revalidation, retain a saved requisition ID for retry, and translate allowlisted public
error digests. Calendar/overlay initialization waits for visible committed content; nested search keeps dialog
focus and Escape behavior. Setup builds include the preview origin and use the website for sample artwork.

The unit/static suite passes 332 tests; lint, workspace types, 363 generated action schemas and unused-code checks
pass. Without retries, 77 focused production browser tests pass, including actual notify delivery to Mailpit and
the WhatsApp sandbox. Both language layout sweeps cover all 156 routes and local tabs at 1440, 768 and 390 pixels.
Their fixtures use typed inputs and explicit customer/deal/invoice records rather than stale cached links. A fresh
combined browser run remains pending; the earlier combined run had 189 passes, 12 failures and one blocked test.
These checks preserve the existing UI and business behavior; the remaining business backend is still TypeScript.

The next combined run reached 196 passes, three failures and three blocked cases. Follow-up fixes remove competing
refreshes from order/procurement/store views and invalidate saved requisition details. Purchase-order submission
retains its saved draft ID for retry and navigates after submission completes. Invoice/deal saves use document
navigation to avoid the reproduced Next transition stall; this workaround remains until an upgrade is verified.
Eight controlled save runs pass. All 38 focused admin cases pass across the follow-up and final order runs,
including failed submission/retry and leaving an editor while its successful response is pending. Fixtures use a
unique buyer and committed-page selectors. Unit/static checks (332), lint, production builds and action schemas
pass. The fresh combined suite finished with 200 passes, four failures and two blocked cases (23.5 minutes).
Remaining failures concern broadcasts, count drafts, transfers and opening an Arabic article editor; it is not green.

### IT session controls (2026-11-02)

The IT dashboard lists identity-issued sessions with realm/account filters and cursor paging, and permits audited
revocation according to `sessions:read/delete`. Identity rechecks the live operator's account, roles, MFA and session
inside the transaction. Revocation ends both access and refresh credentials, is idempotent, and rolls back if its
audit event cannot be written. Serialized desk changes prevent opposing revocations from deadlocking. Revoking the
operator's own session also clears all three browser credential cookies. These tables were already identity-owned;
legacy staff/customer app sessions remain outside this page until their authentication cutover.

Evidence: Go vet, lint, security analysis and the full race suite pass. Real-Postgres/OpenAPI tests cover paging,
orphan sessions, credential exclusion, realm/permission refusals, stale actors, audit rollback, refresh rejection
and concurrent revocation. Frontend unit/static checks pass 332 tests; workspace types, lint and action schemas
pass. Both production IT browser journeys pass without retries (46.3 seconds including startup), covering Arabic
phone/English desktop filters, read-only access, cancel, injected failure/retry, live gateway invalidation, audit
delivery and own-session cookie removal. The broad admin regression suite remains under investigation separately.
Phase 3 remains in progress; staff/customer cutover and later migration waves are unfinished.

A follow-up browser check reproduced a timestamp hydration error with an operator in a different timezone. The
shared IT formatter now matches the server's first render before switching to the operator's local time. Both IT
journeys pass with a Honolulu browser context (43.6 seconds), including local-time output, repeated session-filter
parameters and no browser page errors. Session filters consistently use the first value of repeated parameters.

### Staff policy preview (2026-11-02)

`GET /v1/identity/staff/access` evaluates identity-owned grants, explicit overrides, current module availability and
role data scopes for a live staff session. It preserves the legacy single-role rules, including explicit denial,
older write grants and Super Admin access. Account/session locks and a repeatable-read snapshot protect the policy
read; dependency I/O happens before those locks. The module client rejects redirects, oversized/malformed bodies
and incomplete catalogues. Missing credentials or dependency failures cannot restore default permissions.

Identity's separate service key is restricted by `SYSTEM_MODULE_READ_CALLERS` to module availability. Existing
general settings readers retain their access. No new tables or legacy writes are introduced: this reads the
previous snapshot. Department-member resolution, synchronization with business-owned profiles, final handoff and
staff/customer app integration remain pending. Phase 3 stays **In progress**.

Evidence: 12 shared edge cases and all 22 role templates pass against the actual TypeScript evaluators and Go.
Real-Postgres/OpenAPI tests cover live account/role/session checks, missing snapshots, malformed overrides,
module failures, consistent scope policies and credential exclusion. Go vet, lint, security analysis and the full
race suite pass. Frontend unit/static checks pass 366 tests; lint and workspace types pass. A synthetic fixture on
the rebuilt `platform-verify` stack verified bcrypt-to-Argon2id login, policy changes after module switches, 403
for identity's integration/site reads, and immediate gateway rejection after logout; its fixture records were
deleted and the module choice restored. Both IT browser journeys pass after the backend rebuild (58.9 seconds).
Helm strict lint/render/schema checks pass for default/staging/production (49 valid resources, seven ServiceMonitor
schemas skipped each). The broad browser suite's four remaining failures above are separate and unresolved.

### Identity implementation continuation (2026-11-02)

Implementation is in progress and is not a verified cutover. At the user's request, tests, lint, runtime rehearsals
and deployment verification are deferred until the implementation phases are complete. No new milestone is
marked Done on the strength of these source changes.

The admin's staff login/logout, refresh cookies, JWKS verification, password reset and own-account MFA/security
now call identity. `JWT_SECRET` is retired; existing MFA encryption material is retained for import. Live session
checks protect self-service mutations within their database transaction. Password changes preserve the existing
UI contract by ending every session. Role changes cannot let a stale token use new profile privileges while a
profile synchronization is incomplete. Profile synchronization waits for transaction commit and reports failures;
the temporary LegacyDB profile bridge remains until the owning business domains migrate.

Customer credential registration, email codes, and Google/Apple OAuth backend APIs are under implementation.
Codes have bounded attempts and expiry, authenticated hashes, transactional session creation and audit events.
Provider exchange enforces PKCE/nonce, signature, issuer, audience and expiry checks. OAuth state and verified
proofs stay in identity, encrypted where appropriate; session issuance and provider linking are transactional.
System exposes only Google/Apple configuration and the approved website domain to identity, with no broad
integration-reader grant. River maintenance removes expired auth records. The website still uses its existing
customer authentication until the API integration and data handoff are complete.

Remaining within identity include the customer frontend switch, complete legacy credential/provider/challenge
handoff, invitations and notify templates, IT staff/role/access-copy administration, account projections and
offboarding/access-request integration. All later phases remain as listed in the migration table.

## Request path

1. A server component or server action calls the API client with the user's access token.
2. The gateway matches the route, checks the token's realm, applies the rate limit and forwards the request with
   `X-Request-ID` and the W3C `traceparent`.
3. The service verifies the token again, checks the permission against the catalogue and the stored grants, and runs
   the use case in one database transaction, writing any events to its outbox.
4. Errors come back as RFC 9457 problem details with a stable `code`, which the apps translate.

Phase 2 authenticates app servers with short-lived service tokens ([ADR 0011](../adr/0011-service-authentication.md)). Apps still enforce user permissions. Files are streamed through same-origin app routes; S3 buckets stay private. Attachment business records remain in LegacyDB. Claims now cross a service boundary and are not rolled back with a failed LegacyDB transaction. Identity, per-service database roles and cross-service sagas remain later work.
