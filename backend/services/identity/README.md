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

The command asks for the password without echo (or reads the first line of piped input), needs at least `IDENTITY_LOGIN_IT_PASSWORD_MIN_LENGTH` characters, and prints the `otpauth://` link, its secret and the recovery codes once. Nothing secret is logged. It refuses to run when any IT account exists; further IT accounts are created from the IT dashboard. The first account must have the `it_admin` role so account administration cannot start locked out. `IDENTITY_LOGIN_MFA_ISSUER` names the entry in authenticator apps. See [configuration](../../../docs/backend/CONFIG.md) for environment settings and [identity migration](../../../docs/backend/IDENTITY-MIGRATION.md) for account import and cutover limitations.

From `backend/`, run `go test -race ./services/identity/...` for real Postgres session, account, worker and OpenAPI contract tests. Run `go generate ./services/identity` after editing SQL queries. Existing Prisma user tables and app sessions remain in place.

## IT account recovery

An unused recovery code works in place of a TOTP code on the sign-in form. If the authenticator and every recovery
code are lost, use the offline `recover-it` command in the [operations runbook](../../../docs/backend/OPERATIONS.md#it-administrator-recovery).
It requires database and MFA-key access, an existing active IT administrator and an operator ID. It cannot create,
reactivate or promote accounts. It replaces the password and factor, clears pending enrollment, replaces all
recovery codes and revokes every existing session in one transaction. Account ID and roles stay unchanged.

## IT account administration

The IT dashboard's `/it-accounts` page uses these endpoints with IT-realm tokens. The service locks and rechecks the
live actor account, role assignments, mandatory MFA and session before each action; service/staff/customer tokens
cannot administer IT accounts.

| Endpoint | Permission | Result |
| --- | --- | --- |
| `GET /v1/identity/desk/it-accounts` | `it_accounts:read` | ID/email/roles/status/MFA and login times, cursor paging, password minimum; no credentials |
| `POST /v1/identity/desk/it-accounts` | `it_accounts:create` | Creates a fresh ID, password hash, authenticator and recovery codes; returns provisioning material once |
| `PUT /v1/identity/desk/it-accounts/{id}` | `it_accounts:edit` | Sets the role and active status and revokes existing sessions |

Creation uses the configured password minimum and bounded hashing concurrency. All responses are `no-store`.
Account changes are serialized with bootstrap/recovery, so concurrent requests cannot demote or disable the last
active, MFA-enrolled administrator with a password. Repeating unchanged access is a no-op. Deactivation retains
account and audit references; it never deletes an account. Each successful create/change records the acting IT
account in `identity.user.created` / `identity.user.changed`. An audit failure rolls back the operation, including
session revocation. IT accounts already belong to identity, so this page needs no legacy table handoff. Staff and
customer account migration remains separate work.

## Events

The preview [snapshot importer](../../../docs/backend/IDENTITY-MIGRATION.md) also preserves staff roles, grants,
overrides and role data scopes. Its apply command requires an operator ID and writes `identity.snapshot.imported`
in the same transaction, carrying only that ID and insertion counts. Dry runs and unchanged reruns emit nothing.
Runtime staff authorization and the staff/customer app cutover remain pending.

`identity.user.created`, `identity.user.changed`, `identity.user.recovered`, `identity.session.started`, `identity.session.rotated`,
`identity.session.revoked` and `identity.mfa.changed` are written to `identity.outbox` with their changes. They carry
only account/session IDs, realm, operation/reason and actor; never an address, password, token, secret or recovery
code. Schemas live in [contracts/events](../../../contracts/events). The worker publishes the outbox to NATS and
exposes its lag metrics. Without `NATS_URL`, events wait durably for the relay. Failed authentication emits no
state-change event; refresh reuse commits revocation and its event even though the request is refused.
