# 0003 — Transactional outbox and NATS JetStream for events

- Status: Accepted (2026-11-01)

## Decision

- A service that changes state writes the matching event to its own `outbox` table in the same transaction.
- A relay publishes outbox rows to NATS JetStream (subject `<service>.<entity>.<verb>`, e.g. `finance.invoice.paid`) and marks them sent; delivery is at least once.
- Consumers are idempotent: each records the event IDs it has handled.
- Multi-step work across services is a saga of events with compensating steps, never a distributed transaction.
- Every event has a versioned JSON schema in `contracts/events/`, documented as an AsyncAPI catalogue.

## Consequences

- No event is lost if the broker is down; it is published once the broker is back.
- Readers of other services' data accept eventual consistency, measured as outbox lag on the IT dashboard.
