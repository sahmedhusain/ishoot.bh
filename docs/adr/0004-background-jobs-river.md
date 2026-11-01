# 0004 — River for background and scheduled jobs

- Status: Accepted (2026-11-01)

## Decision

- Background work (email sending, website revalidation, upload cleanup, reminders, payment expiry, courier sync, report schedules) runs as River jobs stored in each service's Postgres schema, executed by that service's `cmd/worker`.
- Periodic jobs replace the `/api/cron` route and the three `scripts/*-worker.cjs` processes. Every schedule and retry limit comes from configuration.
- Jobs are enqueued in the same transaction as the change that needs them.

## Consequences

- No separate scheduler or broker for jobs; jobs survive restarts and are visible (and retryable) from the IT dashboard.
