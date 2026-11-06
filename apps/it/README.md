# IT dashboard (`apps/it`)

The IT department's operational dashboard (see [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#architectural-decisions--core-principles)). Pages communicate with the Go backend microservices through the API gateway. IT staff sign in with **IT accounts**, an isolated authentication realm in the `identity` service with mandatory TOTP MFA.

## Pages & Capabilities

| Page | Permission (`contracts/catalog/it-access.json`) | Backend Service |
|---|---|---|
| `/` | `tickets:read` | `itsm` `GET /v1/itsm/desk/stats` |
| `/tickets` | `tickets:read` (`edit`, `assign` to act) | `itsm` `/v1/itsm/desk/tickets` |
| `/sla` | `ticket_settings:read` (`edit` to change) | `itsm` `/v1/itsm/desk/sla` |
| `/login` | Public authentication | `identity` `/v1/identity/it/...` |
| `/company` | `company:read` (`edit` to save) | `system` `/v1/system/desk/company/...` |
| `/setup` | `setup:execute` | `system` `/v1/system/desk/company/setup` |
| `/modules` | `modules:read` (`edit` to change) | `system` `/v1/system/desk/modules` |
| `/integrations` | `integrations:read` | `system` `/v1/system/desk/integrations` |
| `/site` | `domains:read`, `site_code:read` | `system` `/v1/system/desk/site/...` |
| `/notifications` | `notifications:read` (`execute` to act) | `notify` `/v1/notify/desk/...` |
| `/audit` | `audit:read` | `audit` `/v1/audit/desk/...` |
| `/it-accounts` | `it_accounts:read` (`create`, `edit` to act) | `identity` `/v1/identity/desk/it-accounts` |
| `/staff-accounts` | `staff_access:read` (`edit` to act) | `identity` `/v1/identity/desk/staff/...` |
| `/staff-roles` | `staff_access:read` (`edit` to act) | `identity` `/v1/identity/desk/staff/roles` |
| `/sessions` | `sessions:read` (`delete` to revoke) | `identity` `/v1/identity/desk/sessions` |
| `/system-health` | `system_health:read` | `system` `/v1/system/desk/operations/health` |
| `/database` | `database:read` | `system` `/v1/system/desk/operations/database` |
| `/logs` | `logs:read` | `system` `/v1/system/desk/operations/logs` |
| `/jobs` | `jobs:read` | `system` `/v1/system/desk/operations/jobs` |
| `/api-keys` | `api_keys:read` | `system` `/v1/system/desk/operations/api-keys` |

## Sign-in and Sessions

1. The sign-in action sends the e-mail and password to identity with this app's service token (`IT_SERVICE_KEY`). Identity returns `mfa_required`, prompting for TOTP code or recovery code.
2. The access token, refresh token, and account e-mail are kept in httpOnly, `SameSite=Strict` cookies (`Secure` in production).
3. The proxy middleware renews the access token shortly before expiry (`IT_REFRESH_LEEWAY_SECONDS`).
4. Gateway verifies tokens live against the `identity` service JWKS.

## Running

```bash
## Development, Checks & Testing

```bash
# Standalone run (port 3002)
npm run dev

# Or via run.sh
./run.sh dev it

# Type check
npm run type-check

# Vitest unit tests
npm test

# Playwright journey covering IT login, ticket workflows, modules, staff access management, and session revocation
npm run test:e2e

# Domain-specific check suites
npm run check:support      # Support claims and HR support checks
npm run check:security     # Security action boundaries audit
npm run check:deployment   # Deployment environment configuration validation
```
