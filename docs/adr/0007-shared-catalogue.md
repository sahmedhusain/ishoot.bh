# 0007 — One catalogue for constants shared by Go and TypeScript

- Status: Accepted (2026-11-01)

## Context

Permissions, roles, modules, data scopes, statuses and workflow transitions live in `packages/database/src/constants/*.ts` and are needed by both the apps and the Go services.

## Decision

- `contracts/catalog/*.json` is the single source for every shared constant. The Go generator decodes it strictly (unknown keys fail) and checks it for consistency (every role rule names a known resource and action, every transition a known status).
- Go code is generated from it into `backend/pkg/catalog` (`go generate`); a test fails if the generated file is stale.
- While the TypeScript constants still exist, a unit test proves they match the catalogue exactly, so the two can never drift. When a domain moves to Go, its TypeScript constants are generated from the catalogue instead.

## Consequences

- Adding a permission, module or status is one JSON edit; both languages pick it up.
