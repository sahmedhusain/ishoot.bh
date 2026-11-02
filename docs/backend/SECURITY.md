# Backend security

## Accounts and tokens (see [docs/ARCHITECTURE.md](../ARCHITECTURE.md#architectural-decisions--core-principles))

- **Realms.** There are three separate account realms: `staff` (admin app), `customer` (website) and `it` (IT
  dashboard). A fourth, `service`, covers calls between services. A token's audience is `platform:<realm>`, and every
  route lists the realms it accepts.
- **Access tokens** are EdDSA-signed JWTs with a short lifetime, set in configuration. The verifier
  (`pkg/authn`) checks four things:
  - The algorithm is EdDSA. Others, including `none`, are refused before the signature is checked.
  - The key ID names a published key. An unknown ID refreshes the JWKS cache, but no more often than
    `AUTH_JWKS_MIN_REFRESH`.
  - The issuer, expiry (with `AUTH_CLOCK_SKEW` allowed) and audience are correct.
  - `token_use` is `access`, so a refresh token can never be used as an access token.
- **Defence in depth.** The gateway checks every token, and each service checks it again.
- **Passwords and MFA** (Phase 3):
  - Passwords are hashed with argon2id. Old bcrypt hashes are replaced at the next sign-in.
  - TOTP is optional for staff and customers, and mandatory for IT accounts. IT accounts can also be limited to an
    IP allow-list.

## Secrets at rest

`pkg/secrets` encrypts with AES-256-GCM under a key ring:

- **Format.** New values are written as `v1.<keyID>.<data>` and bound to their use (for example
  `integration:stripe`), so a value copied into another field will not open.
- **Rotation.** Add a key, make it primary, and re-seal values as they are read (`NeedsRotation`).
- **Old data.** The two formats the TypeScript backend wrote (integration credentials and MFA secrets) open with the
  old keys, so existing data needs no migration on day one.

Keys and passwords come from the environment, which Kubernetes fills from Secrets (External Secrets in production).
They are never committed, never logged (`pkg/logx` redacts any key that looks secret) and never returned in errors.

## HTTP

- **Headers on every response** (`pkg/httpx`):
  - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`.
  - A restrictive Content Security Policy.
  - HSTS outside development.
- **Request limits.** There is a body size limit, a request timeout and a server-side SQL statement timeout.
- **Client IPs.** Only proxies listed in `HTTP_TRUSTED_PROXIES` may set the client IP through `X-Forwarded-For`.
- **Request IDs.** Inbound request IDs are only reused if they look like IDs.
- **Errors** never contain internal causes.
- **Rate limits** are shared across replicas. When Valkey is down, requests fail closed (503) unless the operator
  chooses to fail open.

## Network and runtime (Kubernetes)

- **NetworkPolicies, deny by default:**
  - Only the ingress controller reaches the gateway.
  - Only platform pods reach the other services' HTTP ports.
  - Only the monitoring namespace reaches admin ports.
  - Egress is limited to DNS, platform services and the data stores.
- **Database:** each service signs in as its own login (`svc_<service>`), owning its schema and nothing else: no
  superuser, no schema creation, no access to other services' schemas or to the apps' tables. Logins have a
  statement timeout and an idle-in-transaction timeout of their own.
- **Containers** are distroless and non-root (UID 65532), with a read-only root filesystem, no capabilities, no
  privilege escalation, the RuntimeDefault seccomp profile and no service-account token.

## Supply chain

- **Every change.** CI runs golangci-lint (including gosec), govulncheck, gosec and the tests with the race detector.
- **Images.** Each image is scanned with Trivy (high and critical findings fail the build), pushed with an SBOM and
  provenance, and signed keylessly with cosign.
- **Deploys.** The deploy workflow verifies the signatures before running Helm and takes only full commit SHAs as
  tags.
- **The Go toolchain** is pinned in `go.mod` to a patched release.
