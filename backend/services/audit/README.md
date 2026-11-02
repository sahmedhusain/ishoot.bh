# audit service

The platform's audit trail: every event the services publish ([ADR 0003](../../../docs/adr/0003-events-outbox-nats.md)),
recorded once and never changed, for IT to search from the IT dashboard (**Audit trail**, `audit:read`). Owns the
`audit` schema: `event`. The HTTP contract is [api/openapi.yaml](api/openapi.yaml); regenerate the TypeScript client
with `npm --prefix packages/api-client run generate` from the repository root.

## How events arrive

`worker` is a durable JetStream consumer (`audit`) of the whole `EVENTS` stream. Each message becomes one row:

- the ID is the publishing service's event ID (the message ID), so a redelivery or a re-send is stored once; a message
  without one gets an ID derived from its stream position;
- `service`, `entity` and `verb` split the subject; `actor` is the payload's `changedBy` (or `actorId`); `trace_id`
  comes from the `traceparent` header, so an entry links to the trace of the request that made the change;
- nothing is refused: a payload that is not a JSON object is kept under `raw`.

A failed write is not acknowledged, so JetStream delivers the message again after a back-off. A new installation, or
a consumer that was down, catches up from the start of the stream (kept for `NATS_MAX_AGE`).

`audit.event` is append-only: triggers refuse `UPDATE`, `DELETE` and `TRUNCATE`. The service's own login owns the
table, so it could drop a trigger; separating that ownership, retention and archiving are later work.

## Requests

| Path                             | Caller                                           | Authorization                                     |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `GET /v1/audit/desk/events`      | IT staff, with IT-realm access tokens (identity) | `audit:read` (`contracts/catalog/it-access.json`) |
| `GET /v1/audit/desk/events/{id}` | as above                                         | `audit:read`                                      |
| `GET /v1/audit/desk/subjects`    | as above                                         | `audit:read`                                      |

Listings are newest first with cursor paging (`AUDIT_DEFAULT_PAGE_SIZE`, `AUDIT_MAX_PAGE_SIZE`) and filter by
subject, service, actor and time.

## Running

`serve`, `worker`, `migrate` and `healthcheck`. Compose runs `audit-migrate`, then `audit` (admin listener at
`127.0.0.1:9085`) and `audit-worker`. Metrics: `audit_events_recorded_total`, `audit_events_redelivered_total`.

## Verification

From `backend/`, run `go test -race ./services/audit/...` (real Postgres and NATS; responses are checked against the
OpenAPI document).
