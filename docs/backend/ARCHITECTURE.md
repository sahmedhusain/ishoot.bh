# Backend architecture

```
Browser ─▶ apps/web · apps/admin · apps/it   (Next.js: UI, cookies, server components, thin server actions)
                │ server side only: Bearer token + X-Request-ID, generated TypeScript client
                ▼
            gateway ── routing · token check (JWKS) · rate limits (Valkey) · tracing
                ▼
  identity · system · files · notify · audit · workflow · cms · sales · finance · hr · inventory · commerce · delivery · itsm
        │ pgx + sqlc                     │ outbox → NATS JetStream          │ River jobs
        ▼                                ▼                                   ▼
  PostgreSQL 17 (one schema + role per service)    Valkey    S3-compatible storage    OpenTelemetry → Prometheus · Loki · Tempo · Grafana
```

## Principles

- **One service per business domain** ([ADR 0001](../adr/0001-go-echo-microservices.md)). Each service owns its tables
  in its own schema and connects with its own database role ([ADR 0002](../adr/0002-postgres-schema-per-service.md)).
  No service reads another's tables.
- **APIs for questions, events for facts.** Synchronous reads use the owning service's HTTP API, described by
  OpenAPI ([ADR 0006](../adr/0006-openapi-first.md)). Changes other services must react to are events, written to an
  outbox in the same transaction and published to NATS JetStream ([ADR 0003](../adr/0003-events-outbox-nats.md)).
  Background work runs as River jobs ([ADR 0004](../adr/0004-background-jobs-river.md)).
- **The front ends keep their look.** The Next.js apps keep their pages, components and styles. Only their data
  access changes, from Prisma to the generated API client.
- **Configuration, not code.** See [CONFIG](CONFIG.md) and the [catalogue](../adr/0007-shared-catalogue.md).

## Migration status

| Phase | Scope                                                                                 | Status       |
| ----- | ------------------------------------------------------------------------------------- | ------------ |
| 1     | Shared kit, catalogue, gateway, local stack, CI, Helm, docs                           | **Done**; chart validation below |
| 2     | `files` on S3-compatible storage; Supabase removed                                    | Verification |
| 3     | `identity` (staff, customer and IT realms)                                            | In progress  |
| 4     | `system`, `audit`, `notify` and the IT dashboard (`apps/it`)                          | In progress  |
| 5     | `itsm` and IT support in the admin app                                                | In progress  |
| 6     | Domain waves: cms → sales → finance → workflow → hr → inventory → commerce → delivery | Planned      |
| 7     | Retire Prisma, the cron route and the Node workers                                    | Planned      |

What exists today (2026-11-02): identity runs the IT realm with mandatory MFA; staff and customer sign-in still run in
the apps. The system service owns modules, integrations, and the website's domains and site-wide code, all managed
from the IT dashboard, and publishes its changes as events (transactional outbox to NATS JetStream). `itsm` holds IT tickets with SLAs; employees raise them from the admin. Each service signs in
as its own database login behind PgBouncer. The audit service records every event for the IT dashboard's audit
trail, and notify delivers every e-mail and WhatsApp message. In-app notifications, broadcasts and the remaining IT
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
  `go vet ./...`, `make lint`, `make gen-check` and `go test -race ./...` pass. The IT build still loads Prisma through
  integration helpers; removing those calls requires their service replacements, and remains open.
- Frontend unit/static checks (327 tests), lint, every app/package type-check and action-schema checks pass.
  Removed 924 ignored sync copies and 16 `.DS_Store` files, preserving `.agents` and `graphify-out`.
- The full disposable-stack milestone suite and subsequent migration waves remain pending.
  No development database, Compose project or environment values were changed for these checks.

Until a domain moves, the Next.js apps keep using `packages/database` (Prisma) for it, as described in
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
action-schema checks pass. Staff/customer sign-in, access handoff, IT account management and the later domain waves remain unfinished.
No production/development data or environment values were changed. Real-data migration/restore, image scans, load
tests and a cluster smoke deployment are not verified by this milestone.

## Request path

1. A server component or server action calls the API client with the user's access token.
2. The gateway matches the route, checks the token's realm, applies the rate limit and forwards the request with
   `X-Request-ID` and the W3C `traceparent`.
3. The service verifies the token again, checks the permission against the catalogue and the stored grants, and runs
   the use case in one database transaction, writing any events to its outbox.
4. Errors come back as RFC 9457 problem details with a stable `code`, which the apps translate.

Phase 2 authenticates app servers with short-lived service tokens ([ADR 0011](../adr/0011-service-authentication.md)). Apps still enforce user permissions. Files are streamed through same-origin app routes; S3 buckets stay private. Attachment business records remain in Prisma. Claims now cross a service boundary and are not rolled back with a failed Prisma transaction. Identity, per-service database roles and cross-service sagas remain later work.
