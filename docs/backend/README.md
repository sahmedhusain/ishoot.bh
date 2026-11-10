# Backend Microservices Documentation Index

This directory provides comprehensive documentation for the 16 domain-scoped Go microservices, database schemas, events, security policies, and operational runbooks.

---

## Documentation Directory

| Document | Description & Coverage |
|---|---|
| **[ARCHITECTURE](ARCHITECTURE.md)** | System architecture, microservice boundaries, outbox pattern, data ownership, and NATS JetStream event bus. |
| **[SERVICES](SERVICES.md)** | Directory of all 16 microservices, their data schemas, endpoints, and status. |
| **[SECURITY](SECURITY.md)** | Authentication realms (staff, customer, IT), JWT access tokens, Argon2id hashing, TOTP MFA, and AES-256-GCM encryption. |
| **[CONFIG](CONFIG.md)** | Complete environment configuration reference for every microservice (generated from Go structs). |
| **[OPERATIONS](OPERATIONS.md)** | Local Docker stack, PgBouncer pooling, IT administrator recovery runbook, background workers, and Kubernetes Helm deployment. |
| **[OBSERVABILITY](OBSERVABILITY.md)** | Logging (Loki), metrics (Prometheus), tracing (Tempo/OpenTelemetry), and diagnostic profiling (`/debug/pprof/`). |
| **[backend/README](../../backend/README.md)** | Go codebase layout, packages (`pkg/`), CLI tools, and development conventions. |

---

## Microservices Quick Reference

All microservices run distroless non-root Docker containers, exposing public APIs on port `:8080` (routed via gateway) and internal admin endpoints on port `:9090` (`/livez`, `/readyz`, `/metrics`).
