# 0008 — Phased migration, one domain at a time

- Status: Accepted (2026-11-01)

## Decision

Phases, each of which leaves a working system:

1. Foundations: shared kit, catalogue, gateway, local stack, CI, Helm.
2. Postgres-only and the `files` service (Supabase removed).
3. `identity`.
4. `system`, `audit`, `notify` and the IT dashboard.
5. `itsm` and IT support in the admin app.
6. Domain waves: `cms` → `sales` → `finance` → `workflow` → `hr` → `inventory` → `commerce` → `delivery`.
7. Decommission Prisma, the cron route and the Node workers.

In each wave: port the rules with their tests, write the OpenAPI document, switch the front-end calls, move the tables to the service schema (`backend/tools/legacy-migrate`), delete the TypeScript code, run that area's end-to-end tests.

## Consequences

- The UI and the existing Playwright suite act as the regression gate for every wave.
