# Identity service — Phase 3 in progress

The running apps still use TypeScript authentication. This service is not yet deployed and has no API binary.
The session lifecycle contract is `api/openapi.yaml`; login, JWKS publication, account migration, MFA,
OAuth, reset flows and frontend integration remain to be implemented before cutover.

Implemented:

- Ed25519 access-token signing and public-only JWKS serialization, with realm audiences and session expiry caps.

- Opaque 256-bit refresh credentials; only SHA-256 hashes are stored.
- Session families isolated by staff/customer/IT realm and a fixed absolute expiry.
- Atomic one-time refresh rotation using a row lock on the session family.
- Replay detection that commits family revocation before returning an authentication failure.
- Idempotent family logout, including via previously consumed credentials.
- sqlc queries and goose migrations in the identity schema; no cross-domain foreign keys.

The caller of `sessions.Start` must first complete authentication and all applicable MFA/IP-policy checks.
It is an internal use case, not an API allowing callers to create arbitrary user sessions. The future HTTP adapter
must map invalid/replayed credentials to the same 401 problem, redact tokens from logs, set `Cache-Control: no-store`,
and enforce rate limits. Access-token revocation checks must consult session-family status where immediate revocation
is required; short JWT expiry alone does not revoke an already-issued access token.

App servers must serialize refresh attempts per session; concurrent use of the same credential deliberately triggers
replay revocation rather than creating a second token branch.

Consumed refresh hashes remain until the whole family expires. Do not delete them on rotation: they are the evidence
needed to detect replay. The repository can remove expired families and their token history; scheduled expiry cleanup is not wired yet. No existing user tables or app sessions
have been changed by these migrations.

From `backend/`, run `go test -race ./services/identity/...` for real Postgres tests of concurrent refresh, rollback,
replay, expiry, logout and cross-realm rejection, plus OpenAPI validation. Regenerate queries with
`go generate ./services/identity`. See `docs/backend/IDENTITY-MIGRATION.md` for the remaining migration work.
