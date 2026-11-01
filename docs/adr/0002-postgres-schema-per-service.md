# 0002 — Plain PostgreSQL, one schema and one role per service

- Status: Accepted (2026-11-01)

## Context

Supabase supplied only the Postgres host and file storage; its Auth, Realtime and row-level-security policies were never used. All 208 tables live in `public` and reference each other freely.

## Decision

- PostgreSQL 17 everywhere (local, CI, production), with PgBouncer in front.
- Each service owns one schema named after it and connects as its own role, which has no rights on any other schema.
- References to another service's rows are plain UUID columns without foreign keys. Data owned by another service is read through its API, or kept as a read model fed by its events when a hot path needs it.
- Migrations are SQL files run by goose and embedded in the service binary; queries are written in SQL and compiled to Go by sqlc. Existing triggers, CHECK and exclusion constraints and GIN indexes move with their tables.

## Consequences

- A service's data can later move to its own database with no code change, only a new DSN.
- Database rules that span domains (for example a foreign key from an invoice to a user) become application rules with tests.
