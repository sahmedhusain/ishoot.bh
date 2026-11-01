# Phase 3: identity migration boundary

Status: implementation started; authentication still runs in the Next.js apps. Phase 2 is committed at `47aae131`.

## Implemented foundation

`backend/pkg/password` creates salted Argon2id PHC hashes, verifies existing bcrypt 2a/2b/2y credentials,
and reports when a successfully verified credential needs upgrading. Incorrect credentials never trigger rehashing.
Hash parsing rejects unsupported algorithms/versions, malformed encodings and parameters outside configured resource
limits before invoking the KDF. New-hash defaults use 19 MiB, two iterations and one lane, matching the
[OWASP minimum](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Configuration has environment tags and validates at construction; it will be embedded in identity settings when
that service is wired. The future login use case must also bound concurrent KDF operations and apply account/IP
rate limits. Password-policy validation, dummy verification for nonexistent users and atomic replacement of a
verified legacy hash belong in that use case. The package alone does not switch authentication or move tables.

## Existing contracts to preserve

Staff authentication enters through `apps/admin/app/api/auth/{login,mfa,logout,me,forgot-password,reset-password}`.
`apps/admin/lib/auth.ts` resolves the session to the existing Profile DTO and computes effective permission grants.
Its exported functions are consumed by pages and server actions, so those signatures must remain stable at cutover.
`packages/database/src/queries/sessions.ts` stores SHA-256 session-token hashes and selects only public profile fields.

Identity data currently spans `User`, `Session`, `Role`, `RoleDataScope`, `Permission`, `MfaRecoveryCode`,
`AuthChallenge`, `Customer`, `CustomerSession` and `CustomerAuthCode`. Complete the dependency inventory before moving
any table. `CustomerAddress` and commercial customer relationships remain business data and need an explicit boundary.

`User` combines credentials/MFA with employee hierarchy, department links, signatures, commission and sales settings.
`Customer` combines credentials/OAuth subjects with CRM, addresses, wishlist and order relationships. Moving these
whole tables without porting their readers would break the remaining Prisma domains. Split authentication ownership
from business projections, retain IDs, remove cross-service foreign keys only when their readers have replacements,
and document the projection synchronization before writing the handoff migration.

## Required implementation sequence

1. Inventory staff/customer authentication, enrollment, recovery, password reset, OAuth and permission callers and their
   current regression tests. Account for bootstrap and every demo profile, not only interactive login.
2. Write OpenAPI contracts for all three isolated realms, JWKS, access tokens, refresh rotation/reuse detection,
   session revocation, profile/permission reads, password reset and MFA enrollment/recovery.
3. Implement pure domain rules and use cases with tests, then sqlc repositories and real Postgres contract tests.
   Accept existing bcrypt hashes and encrypted TOTP formats; rehash to Argon2id after successful login. Never move or
   print encryption keys. IT authentication requires completed MFA enrollment and its configured network policy.
4. Prove the account/projection handoff on a disposable seeded database, including UTC timestamps, stable IDs,
   permission parity and a restore rehearsal. Existing staff sessions end once at cutover, as ADR 0005 specifies.
5. Generate the TS client and preserve existing app cookies/DTO adapters while changing their data source. Wire the
   gateway, Compose, worker/migrations, Helm, CI and env tool together before enabling identity in either app.
6. Run the complete authentication/security regression suite and serial browser tests for staff, customer, setup,
   MFA, OAuth, reset and logout. Verify cookies and token realm isolation; reject refresh reuse and revoked sessions.

## Constraints carried from the accepted plan

- Continue on `feat/go-backend` in the current checkout; no additional worktree is required.
- Service-to-service callers retain ADR 0011 app keys during migration. User tokens follow ADR 0005.
- Do not retire working TS auth or change ownership of its tables until replacement tests and APIs are ready.
- Identity completion does not complete Phase 4: system/audit/notify and the IT app remain separate milestones.
