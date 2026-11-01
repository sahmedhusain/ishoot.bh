# Backend

Go services that replace the TypeScript backend of the Next.js apps, one business domain at a time
([ADR 0008](../docs/adr/0008-phased-migration.md)). Start with [docs/backend](../docs/backend/README.md).

## Quick start

```bash
./run.sh env sync                  # adds the backend variables to .env and generates their secrets
docker compose up -d --build       # Postgres 17, Valkey and the gateway on 127.0.0.1
curl -s localhost:9080/readyz      # gateway readiness (admin port)
```

Day-to-day work happens in this folder:

```bash
make help        # every task
make test-short  # unit tests, no Docker
make test        # all tests with the race detector; integration tests start Postgres in Docker
make check       # what CI runs: generated code current, lint, vulnerabilities, tests
```

Requirements: Go (the toolchain in `go.mod` is downloaded automatically) and Docker. Linters and scanners are pinned in
the `Makefile` and run with `go run`, so nothing else needs installing.

## Layout

```
backend/
  pkg/                 shared kit, imported by every service (nothing is copied between services)
    config             environment → typed, validated settings
    logx               structured JSON logs, runtime log level, secret redaction, request-scoped fields
    problem            RFC 9457 error responses
    httpx              Echo server, middleware chain, metrics, admin listener, graceful shutdown
    health             readiness checks
    authn              access-token verification (EdDSA JWT, JWKS) and realms
    ratelimit          shared rate limits (Redis/Valkey, GCRA)
    telemetry          OpenTelemetry tracing
    db                 PostgreSQL pool, statement timeout, transactions
    redisx             Redis/Valkey client
    secrets            AES-256-GCM key ring (reads the old TypeScript formats too)
    catalog            shared constants from contracts/catalog (go generate)
    testkit            disposable Postgres for integration tests
  services/<name>/
    cmd/api            the service's entry point
    settings           its configuration struct (exported for the config reference)
    internal/...       everything else: domain rules, use cases, HTTP and database adapters
    config/            files mounted into the container (e.g. the gateway route table)
    README.md          purpose, endpoints, configuration, runbook
  tools/               generators (catalogue copy, configuration reference)
  Dockerfile           one image recipe for every service (--build-arg SERVICE=<name>)
  Makefile
```

## Conventions

- **No hard-coded values.** Ports, URLs, timeouts, limits and schedules come from the environment through the service's
  `settings.Config`; defaults sit in its `envDefault` tags and are listed in
  [docs/backend/CONFIG.md](../docs/backend/CONFIG.md) (generated). Business values that change at runtime live in the
  database of the service that owns them. Shared constants (permissions, modules, statuses, ticket categories) live in
  [`contracts/catalog`](../contracts/catalog) ([ADR 0007](../docs/adr/0007-shared-catalogue.md)).
- **Errors** are `problem.Problem` values. Anything else becomes a bare 500; the cause is logged, never returned.
- **Every request** carries `X-Request-ID` and a trace. Both appear in every log line.
- **Two listeners per service.** Public HTTP on `:8080`. Internal admin on `:9090` (`/livez`, `/readyz`, `/metrics`,
  `/runtime/log-level`, optional pprof), which is never exposed through the gateway or an ingress.
- **Tests sit next to the code.** Table-driven unit tests, `httptest` handler tests, and integration tests against
  real Postgres via `pkg/testkit`, skipped with `-short`.
