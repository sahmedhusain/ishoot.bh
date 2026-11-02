# Phase 3: identity migration boundary

Status: in progress. The identity API, worker and account import are available as a preview; admin and web continue to use their existing TypeScript authentication.

## What is implemented

The preview service issues realm-specific Ed25519 access tokens and publishes public signing keys. Service-authenticated endpoints support password login, refresh-token rotation and logout. Refresh tokens are stored as hashes; reuse revokes the session family. Login accepts existing bcrypt hashes and upgrades them to Argon2id after successful verification. It supports existing encrypted TOTP secrets and one-use recovery codes, self-service enrollment and factor rotation, requires MFA for IT accounts, bounds password-hashing concurrency, and uses Redis for account and IP limits. A River worker cleans expired session families. The session-status endpoint checks account, roles and session state, and the gateway requires it for user-authenticated routes. See the [service README](../../backend/services/identity/README.md) and [configuration reference](CONFIG.md).

`backend/tools/identity-import` reads legacy staff and customer authentication data into identity-owned account tables without deleting or changing the legacy tables. It preserves subject IDs, password hashes, existing MFA secrets and recovery-code use state. It validates email normalization, credentials and MFA decryption, rejects conflicting or extra target records, and runs the import in one transaction. Repeating an unchanged import is safe. This is a snapshot, not ongoing synchronization.

To rehearse on a disposable database copy, run the identity migration, then the importer from `backend/` with `DATABASE_URL` pointing at the copy. The database role needs temporary read access to the legacy tables and write access to the identity schema. Configure `IDENTITY_LOGIN_MFA_LEGACY_KEY` to the existing `MFA_ENCRYPTION_KEY` and provide the configured identity MFA key ring; the importer verifies enabled secrets against their original user IDs. Run:

```sh
SERVICE_NAME=identity go run ./services/identity/cmd/api migrate
go run ./tools/identity-import          # validate only
go run ./tools/identity-import -apply   # write the snapshot
go run ./tools/identity-import -apply   # verify an unchanged rerun
```

A successful rehearsal does not authorize a production cutover. Before an eventual cutover, take and test a backup, pause legacy authentication and account writes throughout the final import and switch, and verify the result before resuming writes. Identity and the legacy app otherwise diverge. The importer does not migrate active sessions; existing sessions must end at cutover. It also does not migrate pending invitations, reset challenges or customer email codes.

## Recorded snapshot rehearsal (2026-11-02)

A read-only clone of an offline developer database volume supplied a 1,662,443-byte public-schema archive. It was
restored into an isolated `_test` database in `platform-verify`, then identity migrations and the importer's
validation/apply/rerun sequence were run there. It copied 23 staff and 24 customer accounts. The unchanged rerun
inserted zero rows. A new archive of the migrated copy (1,691,184 bytes) was restored into a second disposable
database; the importer again validated the snapshot and inserted zero rows. Migration/import/second restore took
38 seconds after the initial public-schema restore. The original volumes were mounted read-only, and all schema
changes ran on disposable copies. The source contained zero recovery-code rows; encrypted MFA/recovery preservation
is covered by the Go integration fixtures.

Use `pg_restore --clean --if-exists --no-owner --no-acl` only against the disposable destination: a newly created
Postgres database already contains `public`, and a public-schema archive recreates it. Set `SERVICE_NAME=identity`
when invoking the migration binary outside Compose, with both database URLs pointing directly at the copy. Protect
the archives and matching legacy MFA key; keep them out of test artifacts and logs.

This evidence covers the authentication snapshot and its database restore. Staff/customer cutover, effective access,
active MFA on real data, file/bucket restore and cross-service recovery remain unverified. Retain the migration
tools until the full migration and restore rehearsal succeeds.

## Remaining before cutover

- Implement and test OAuth, customer email codes and registration, password reset and invitations, MFA administration
  and reset, and the staff/customer access handoff. IT account management, first-account bootstrap and offline administrator recovery are implemented;
  recovery is documented in the [operations runbook](OPERATIONS.md#it-administrator-recovery).
- Preserve staff profile, role, permission, data-scope and override behavior. Define synchronization between identity and the remaining business-owned user and customer projections.
- Ensure all user-token traffic reaches services through the gateway or an equivalent live session check, and configure the identity status URL and network policy.
- Integrate the generated client, gateway, app cookies and existing auth DTOs; preserve existing auth exports and authorization behavior. Wire production deployment and key rotation.
- Rehearse migration and restore with real customer, MFA and recovery-code data; verify permission parity and run the staff, customer, setup, OAuth, MFA, reset and logout regression and browser suites.

`User` and `Customer` also contain business relationships used by Prisma. Do not move or delete those tables until their remaining readers and projections have replacements. No cross-service foreign keys are added by the identity snapshot. See [ADR 0005](../adr/0005-identity-realms.md) and the original architecture plan for the intended boundaries.
