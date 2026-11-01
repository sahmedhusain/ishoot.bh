# system service

Installation-wide settings the IT team manages from the IT dashboard ([ADR 0010](../../../docs/adr/0010-it-dashboard.md)).
Today it owns **modules**, **integrations** and the **site**: which optional areas of the platform are switched on,
external service credentials (encrypted at rest), and the website's domains and site-wide analytics and code. Runtime
configuration and company settings move here next (Phase 4). The HTTP contract
is [api/openapi.yaml](api/openapi.yaml); regenerate the TypeScript client with `pnpm --filter @platform/api-client generate`
from the repository root.

## Modules

Module keys, names and defaults come from [`contracts/catalog/modules.json`](../../../contracts/catalog/modules.json)
(generated from `packages/database/src/constants/features.ts`). The service stores only the choices people made in
`system.module_setting` (key, on/off, who and when); a module nobody switched follows its catalogue default, and a
module added in a later version appears with its default without any data change.

| Path                           | Caller                                 | Allowed                                   |
| ------------------------------ | -------------------------------------- | ----------------------------------------- |
| `GET /v1/system/modules`       | Apps' back ends (service tokens)       | `SYSTEM_READ_CALLERS`                     |
| `PUT /v1/system/modules/{key}` | The admin's setup wizard, for a person | `SYSTEM_MODULE_WRITERS`                   |
| `/v1/system/desk/modules`      | IT staff (IT-realm tokens)             | `modules:read`, `modules:edit` (IT roles) |

Each change records who made it: `<caller>:<person>` for a service acting for someone, `it:<IT account>` for IT
staff. The apps read modules through `packages/database/src/queries/features.ts`, which keeps a short in-process cache
(`SYSTEM_MODULES_CACHE_MS`, default 5 s). The public website's own page cache refreshes within its 60-second lifetime
after the website (`cms`) module changes.

## Integrations

Provider keys, required fields, secret masks and URLs come from [`contracts/catalog/integrations.json`](../../../contracts/catalog/integrations.json)
(generated from `packages/database/src/constants/integrations.ts`). The service stores active status, non-secret config,
health status, account names, and credentials encrypted with AES-256-GCM (`pkg/secrets`) in `system.integration_setting`.
During migration, `SECRETS_LEGACY_INTEGRATION_KEY` allows opening existing credentials stored under Prisma's `ENCRYPTION_KEY`.

| Path                                         | Caller                           | Allowed                                         |
| -------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| `GET /v1/system/integrations`                | Apps' back ends (service tokens) | `SYSTEM_READ_CALLERS`                           |
| `GET /v1/system/integrations/{provider}`     | Apps' back ends (service tokens) | `SYSTEM_READ_CALLERS`                           |
| `PUT /v1/system/integrations/{provider}`     | Apps' back ends (service tokens) | `SYSTEM_INTEGRATION_WRITERS`                    |
| `DELETE /v1/system/integrations/{provider}`  | Apps' back ends (service tokens) | `SYSTEM_INTEGRATION_WRITERS`                    |
| `POST /v1/system/integrations/{p}/status`    | Apps' back ends (service tokens) | `SYSTEM_READ_CALLERS`                           |
| `/v1/system/desk/integrations`               | IT staff (IT-realm tokens)       | `integrations:read`, `integrations:edit` (IT roles) |

## Site

`system.site_setting` is one row: the public website's domain, the admin's own domain (normalised host names, which
must differ), and the site-wide code: Google Analytics, Meta Pixel and TikTok Pixel ids (checked against strict
patterns) and head and body code of up to 50,000 characters each, which the website runs in a hidden sandboxed frame.

| Path                              | Caller                                 | Allowed                                     |
| --------------------------------- | -------------------------------------- | ------------------------------------------- |
| `GET /v1/system/site`             | Apps' back ends (service tokens)       | `SYSTEM_READ_CALLERS`                       |
| `PUT /v1/system/site/domains`     | The admin's setup wizard, for a person | `SYSTEM_DOMAIN_WRITERS`                     |
| `/v1/system/desk/site/domains`    | IT staff (IT-realm tokens)             | `domains:read`, `domains:edit` (IT roles)   |
| `/v1/system/desk/site/code`       | IT staff (IT-realm tokens)             | `site_code:read`, `site_code:edit`          |

The apps read the site through `packages/database/src/queries/site.ts` (in-process cache `SYSTEM_SITE_CACHE_MS`,
default 5 s): company settings take their domains from it, and the website takes its code, so a code change reaches
the website within that time. After a domain change the IT dashboard asks the website to drop its cached company
data (`WEB_URL`, `REVALIDATION_SECRET`). Custom-code blocks inside CMS pages stay in the admin (`cms_code:edit`)
until the CMS wave.

## Data handoff

The Prisma migrations move `"FeatureToggle"` and `"IntegrationSetting"` into the system schema with their data:
- `20261102090000_move_modules_to_system_service`
- `20261102120000_move_integrations_to_system_service`
- `20261102150000_move_site_settings_to_system_service`: the domains from `"CompanySetting"` and the site code from
  the website content (the published code when the website was published, otherwise the draft's); the legacy
  columns and the `code` key in the draft, published and previous snapshots are removed

If the system service created its tables first, legacy choices and credentials are copied, and the legacy tables
are dropped; a value the service already has wins. `migrations/handoff_test.go` checks both orders for each.

The handoff keeps choices only when Prisma and the services share one database, as in production. In local
development the apps' database (local Supabase) and the stack's Postgres are separate, so the old choices move into
the apps' database and the service starts from the catalogue defaults: set modules again from the IT dashboard
(`/modules`).

## Running

The binary supports `serve`, `migrate` and `healthcheck`; there are no background jobs yet. Compose runs
`system-migrate`, then `system` (admin listener at `127.0.0.1:9084`). Every test database shares the stack's
system service, so end-to-end specs restore the modules they switch (`tests/e2e/modules.ts`).

## Verification

From `backend/`, run `go test -race ./services/system/...` (real Postgres; every response is checked against the
OpenAPI document).
