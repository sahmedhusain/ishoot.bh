# 0011 — Callers authenticate to services with self-signed service tokens

- Status: Accepted (2026-11-01). Amends [0005](0005-identity-realms.md) on service-to-service calls.

## Context

ADR 0005 said services would get short-lived tokens from the identity service. That would make identity a
dependency of every internal call, and the `files` service (phase 2) is needed before identity exists (phase 3).

## Decision

- Every caller (a backend service, or a Next.js app acting as the back end of its front end) has its own Ed25519 key
  pair. It signs a short-lived JWT for each call (or reuses one for a minute):
  - `iss` is `service:<caller>`, and `kid` is the key ID.
  - `aud` is `platform:service`, and `token_use` is `access`.
  - `sub` is the caller's name.
- Services and the gateway trust the public keys listed in a JWKS file (`AUTH_SERVICE_KEYS_FILE`), mounted from a
  Secret. Rotating a key means adding the new public key, switching the caller, then removing the old key.
- **Acting for a user.** When an app calls on behalf of a signed-in user, it has already checked that user's
  permission. It passes the user's ID in the request (for example `ownerId`), and the service enforces ownership
  rules on that ID. Once identity is live, the apps forward the user's own access token instead, and services check
  permissions themselves.
- User tokens from identity (staff, customer, IT) keep the design of ADR 0005; only service calls change.

## Consequences

- No round trip and no single point of failure for internal calls.
- A leaked app key lets the holder call services as that app. Keys live only in Secrets, are short-lived in use
  (tokens expire within minutes), and are rotated by configuration.
