# Track A continuation — 1 November 2026

## Checkpoint and scope

Continue `feat/quick-wins` from Claude's pushed checkpoint `de8112ed`. Complete and verify A before starting B. The supplied roadmap is now preserved in `PLATFORM_ROADMAP_2026-11.md`.

Confirmed checkpoint: A1 security/query work, A2 invoice/receipt layouts, A3 page headers, knip cleanup, schema alignment and GOSI fixture configuration. The reported login company placeholder was a misread, not a reproduced bug.

## Implementation in this continuation

- E2E staff fixtures create missing employees through `createEmployee`, preserving EMP numbering and one current employment record. Re-running fixtures does not create duplicate employees.
- Test servers and CI origins consistently use 3012–3014. Encryption-dependent fixtures have a disposable default key. Courier tests enable and restore their delivery prerequisite.
- Brand-isolation tests exclude names shared by the active demo and another profile; those names are not evidence of a leak.
- Shared semantic `DataTable` adopted by list and management screens. Existing controls, links, filters and pagination remain with their callers.
- Minutes have a separate system-layout screen with metadata, attendees, discussion, decisions and actions. The original browser-print document remains hidden until printing. Server PDF implementation is unchanged.
- Settlements and letters already had screen layouts, contrary to the handoff description; their detail cards now use the shared document card.
- Public website: localized loading boundary, locale error boundary, branded manifest and generated Open Graph image. The manifest uses browser display and does not claim offline support.

## Verification record

- Baseline: lint passed; all eight workspace type checks passed; 333 unit/static tests passed; knip passed.
- Isolated `platform_codex_a_test`: fixture rerun, GOSI check, all 70 integrity rules passed; migration/database-to-schema diff empty.
- Browser suite first attempt: login setup timed out; 164 dependent tests did not run. This is not a completed e2e baseline.
- UI changes require final lint/types/static checks and browser review before declaring A complete.

## Roadmap review before B

The A → B → C order is sound. The following are acceptance requirements for B, not additional Track A features:

1. **Tenant enforcement:** enumerate every Prisma operation, nested create/connect/connectOrCreate/upsert/update, relational filters, aggregate/groupBy, transactions and raw SQL. Check both ends of cross-record relationships. A top-level query extension alone is insufficient. Test requests, jobs, webhooks, public token routes, file downloads, exports and website host resolution. Fail closed without an authorized company context.
2. **Context lifetime:** scope AsyncLocalStorage to the full request/job execution. Authentication alone must not grant an arbitrary `activeCompanyId`. Company switching and consolidated views must validate current assignments. `asSystem` must have a narrow audited purpose, not become a routine bypass.
3. **Scope semantics:** branch, department, project and asset scopes are intersecting dimensions, not a universally nested rank hierarchy. Define union/intersection and deny precedence for multi-hat assignments. Make external-role restrictions and field masking survive grant merging.
4. **Migration rollout:** split B1 into model inventory, nullable columns/backfill, dual-read/write compatibility, validation, constraint enforcement and cutover. Specify a backup/restore rehearsal, lock/time budgets and rollback behavior before changing populated tables. Use per-company composite foreign keys where appropriate.
5. **Money and approvals:** specify decimal rounding, conversion date/rate provenance, policy version snapshots, concurrent decisions, idempotency and delegation expiry at decision time. Preserve maker-checker rules through delegates and overrides.
6. **Hierarchy and audit:** prevent company/manager cycles. Clarify legal entities versus organizational clusters/divisions. Specify immutable audit retention and maintenance procedures without weakening ordinary append-only behavior.
7. **Caching and delivery gates:** include company and authorization-sensitive dimensions in cache keys, invalidate on grant changes, and prove cross-company isolation before enabling group reports. D/E/F still depend on the B1 tenant foundation even when scheduling work after B2.

Use actual repository commands: `pnpm type-check`, `pnpm audit:unused`, `pnpm test`, `pnpm lint`, `pnpm test:brand`. The proposed contracting-group demo depends on B3 templates and should not be a Track A gate. Do not reset a development/demo database merely to satisfy an automated phase check; disposable `_test` databases are sufficient for migration and seed validation here.
