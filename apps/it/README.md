# IT dashboard (`apps/it`)

The IT department's own dashboard ([ADR 0010](../../docs/adr/0010-it-dashboard.md)). Migrated pages read through the
backend gateway. Integration connection tests and social synchronization still import legacy database helpers;
removing those calls requires their service replacements. People sign in with **IT accounts**, a realm of their own in the identity service,
and an authenticator is always required.

| Page             | Needs (`contracts/catalog/it-access.json`)   | Backend                                                                      |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `/`              | `tickets:read`                               | itsm `GET /v1/itsm/desk/stats`                                               |
| `/tickets`       | `tickets:read` (`edit`, `assign` to act)     | itsm `/v1/itsm/desk/tickets`                                                 |
| `/sla`           | `ticket_settings:read` (`edit` to change)    | itsm `/v1/itsm/desk/sla`                                                     |
| `/login`         | —                                            | identity `/v1/identity/it/...`                                               |
| `/modules`       | `modules:read` (`edit` to change)            | system `/v1/system/desk/modules`                                             |
| `/integrations`  | `integrations:read`                          | system `/v1/system/desk/integrations`; legacy connection/sync helpers remain |
| `/site`          | `domains:read`, `site_code:read`             | system `/v1/system/desk/site/...`                                            |
| `/notifications` | `notifications:read` (`execute` to act)      | notify `/v1/notify/desk/...`                                                 |
| `/audit`         | `audit:read`                                 | audit `/v1/audit/desk/...`                                                   |
| `/it-accounts`   | `it_accounts:read` (`create`, `edit` to act) | identity `/v1/identity/desk/it-accounts`                                     |
| `/sessions`      | `sessions:read` (`delete` to revoke)        | identity `/v1/identity/desk/sessions`                                        |

Company settings, staff accounts and the remaining operations pages listed in the ADR are still to move here.

## Sign-in and sessions

1. The sign-in action sends the e-mail and password to identity with this app's service token (`IT_SERVICE_KEY`).
   Identity answers `mfa_required`, and the form asks for the authenticator or a recovery code.
2. The access token, the refresh credential and the account's e-mail are kept in httpOnly, `SameSite=Strict` cookies
   (`Secure` in production). Pages verify the access token's signature, issuer, audience (`platform:it`) and expiry
   against identity's keys (`IT_IDENTITY_JWKS_URL`).
3. The middleware renews the access token shortly before it expires (`IT_REFRESH_LEEWAY_SECONDS`). A refresh credential
   works once; simultaneous renewals in one server share one call. With several replicas, keep a browser on one
   replica (sticky sessions).
4. Backend calls carry the person's own token, and the gateway checks it live against identity, so a disabled account,
   a changed role or a revoked session stops working at once. The pages hide what the role does not allow; the
   services enforce it.

The first IT account is created with `docker compose run --rm identity bootstrap-it -email …` (see the identity
service README); it prints the authenticator link and recovery codes once.
Further IT accounts are created from **IT accounts**, which shows fresh provisioning material once. Role changes
and deactivation end existing sessions; the service refuses removing the last active administrator. See the
[offline administrator recovery runbook](../../docs/backend/OPERATIONS.md#it-administrator-recovery) if all factors are lost.

**Sessions** filters identity-issued sessions by account type and account ID. Ending one requires confirmation
and immediately invalidates its access and refresh credentials; ending the current session returns to sign-in.
Engineers and auditors can read; IT administrators and support can revoke. The page explicitly excludes the
existing staff/customer app sessions, whose sign-in migration is still pending.

## Running

```bash
./run.sh dev it
```

The app runs on port 3002 and reads the root `.env` (`API_URL`, `IT_SERVICE_KEY`, `IDENTITY_ISSUER`,
`IT_IDENTITY_JWKS_URL`; optional `IT_DEFAULT_LOCALE`, `IT_CLIENT_IP_HEADER`). It shares the admin's design system
(`apps/admin/app/globals.css`, its Tailwind configuration and `@platform/ui`) and its copy is in
`packages/locales/src/it`, in English and Arabic.

## Tests

`tests/e2e/specs/it` signs in with a password and an authenticator, works tickets, settings, notifications and audit,
then creates an IT account, changes its role, verifies its MFA and permission boundary, deactivates it and checks
session revocation. It also verifies that the last administrator cannot be deactivated.
The sessions journey checks Arabic/English confirmation, canceled/failed revocation, read-only engineer access,
gateway and refresh rejection after revocation, and ending the current session. It waits for a fresh authenticator
step before signing in because the preceding serial IT journey may have consumed the current code.
`node tests/e2e/it-account.cjs` creates the account it uses (once per database) with `bootstrap-it`.
