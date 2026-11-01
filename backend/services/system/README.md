# system service

Installation-wide settings the IT team manages from the IT dashboard ([ADR 0010](../../../docs/adr/0010-it-dashboard.md)).
Today it owns **modules**: which optional areas of the platform are switched on. Integrations, domains and runtime
configuration move here next (Phase 4). The HTTP contract is [api/openapi.yaml](api/openapi.yaml); regenerate the
TypeScript client with `pnpm --filter @platform/api-client generate` from the repository root.

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

## Data handoff

The Prisma migration `20261102090000_move_modules_to_system_service` moves `"FeatureToggle"` into the system schema
with its data. If the system service created its table first, legacy choices are copied for modules it has no choice
for yet, and the legacy table is dropped. `migrations/handoff_test.go` checks both orders.

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
