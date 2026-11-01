# 0006 — OpenAPI-first contracts and a generated TypeScript client

- Status: Accepted (2026-11-01)

## Decision

- Each service publishes an OpenAPI 3.1 document at `api/openapi.yaml`, written before the handlers. The gateway validates requests against it.
- `packages/api-client` is generated from those documents (openapi-typescript + openapi-fetch). It is server-only: Next.js server components and server actions call it with the user's token and forward `X-Request-ID`.
- Errors follow RFC 9457 (`application/problem+json`).
- The API reference is generated from the same documents.

## Consequences

- Front-end calls are type-checked against the backend; a breaking change fails the build.
