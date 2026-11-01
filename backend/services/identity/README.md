# Identity service — Phase 3 in progress

Identity runs in the default stack and signs in IT accounts for the IT dashboard. The admin and web apps still use their existing authentication; do not route their traffic to this service until the remaining flows and revocation checks are complete.

The API publishes `/.well-known/jwks.json` and accepts service-authenticated login, refresh and logout requests for the staff, customer and IT realms. Caller allowlists are configured separately per realm: by default `admin` serves staff, `web` serves customers and `it` serves IT accounts. A service token's subject must match its signing caller. Run `./run.sh env sync` and `./run.sh env secrets` after upgrading an existing local environment to generate the IT caller key and publish its public half. Password login (`IDENTITY_LOGIN_ENABLED`, on in Compose and Helm) verifies existing bcrypt hashes, upgrades them to Argon2id after successful authentication, applies Redis-backed account and IP limits, and verifies enrolled TOTP or recovery codes. IT login requires MFA and can enforce a network allowlist. Session creation, MFA consumption and password upgrade are transactional. Authenticated users can start or cancel MFA enrollment, confirm an authenticator and receive recovery codes once, or disable MFA with a current factor. Factor replacement also requires the current factor. Confirmation and disablement revoke existing sessions; IT accounts cannot disable MFA. The worker clears expired pending enrollment secrets. Refresh rotation detects reuse and revokes the family; expired families are removed by the River worker.

Access tokens are signed with an Ed25519 key and have realm-specific audiences. Configure previous public keys during signing-key rotation so existing tokens remain verifiable until they expire. Signing keys and refresh credentials must remain secret. The API sets `Cache-Control: no-store` for credential responses. The session-status endpoint verifies an access token against the live account, roles and session family. The gateway requires this check for user-authenticated routes and fails closed when identity is unavailable. Downstream services accepting user tokens directly must enforce the same check or remain reachable only through the gateway. For IP-restricted IT accounts behind a gateway, configure `IDENTITY_TRUSTED_PROXIES` to the gateway's trusted CIDRs so MFA management checks the real client IP; leaving it empty trusts no forwarded headers. App servers must serialize refresh requests per session; simultaneous reuse of a credential revokes its family.

`docker compose up -d --build --wait` starts identity's migration, API and worker with the rest of the stack. The gateway routes `/v1/identity/` (service tokens and IT access tokens) and checks every user-token request against `GET /v1/identity/session`; JWKS is read inside the network, never through the gateway.

## First IT account

IT sign-in requires an enrolled authenticator, and enrolling needs a session, so the first IT account is created with its authenticator already enrolled:

```bash
docker compose run --rm identity bootstrap-it -email it-admin@example.com
```

The command asks for the password without echo (or reads the first line of piped input), needs at least `IDENTITY_LOGIN_IT_PASSWORD_MIN_LENGTH` characters, and prints the `otpauth://` link, its secret and the recovery codes once. Nothing secret is logged. It refuses to run when any IT account exists; further IT accounts are created from the IT dashboard. The role defaults to `it_admin` (`-role` takes any role in `contracts/catalog/it-access.json`), and `IDENTITY_LOGIN_MFA_ISSUER` names the entry in authenticator apps. See [configuration](../../../docs/backend/CONFIG.md) for environment settings and [identity migration](../../../docs/backend/IDENTITY-MIGRATION.md) for account import and cutover limitations.

From `backend/`, run `go test -race ./services/identity/...` for real Postgres session, account, worker and OpenAPI contract tests. Run `go generate ./services/identity` after editing SQL queries. Existing Prisma user tables and app sessions remain in place.
