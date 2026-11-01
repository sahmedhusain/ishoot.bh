# 0001 — Backend in Go with Echo, one service per business domain

- Status: Accepted (2026-11-01)

## Context

The backend lives inside two Next.js apps: about 367 server actions, 51 route handlers and a 65k-line Prisma data package that every page imports. Business rules, data access and rendering are mixed, nothing can scale or deploy on its own, and background work depends on a cron route.

## Decision

- Write the backend in Go (version pinned in `backend/go.work`) with the Echo v4 framework.
- Split it into services along business domains: `gateway`, `identity`, `system`, `files`, `notify`, `audit`, `workflow`, `cms`, `sales`, `finance`, `hr`, `inventory`, `commerce`, `delivery`, `itsm`.
- Every service has the same layout: `cmd/api`, `cmd/worker`, `internal/domain` (pure rules), `internal/app` (use cases), `internal/adapters/{http,postgres,events}`, `migrations/`, `queries/`, `api/openapi.yaml`, `README.md`.
- Everything that more than one service needs lives once in the shared module `backend/pkg` (config, logging, HTTP server, errors, auth, database, events, jobs, storage, crypto, health, telemetry, test kit).

## Consequences

- Services deploy and scale independently; a failure in one domain does not take down the others.
- Cross-domain work needs events or API calls instead of one database transaction (see 0003).
- The Next.js apps keep only UI concerns and call the backend through the gateway.
