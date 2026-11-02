# itsm service

IT tickets: employees raise requests from the admin app; IT staff work them from the IT dashboard (see [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md#architectural-decisions--core-principles)). Owns the
`itsm` schema: `ticket`, `ticket_event` (the audit trail), `ticket_comment`, `ticket_attachment` and `sla_policy`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); regenerate the TypeScript client with
`npm --prefix packages/api-client run generate` from the repository root.

## Rules

Categories and subcategories, priorities, statuses, transitions, the statuses that count as open and the transitions
a requester may use all come from [`contracts/catalog/itsm.json`](../../../contracts/catalog/itsm.json). Nothing about
the workflow is coded in the service.

- A new ticket starts in the catalogue's first status, with the default priority when none is given. Its response and
  resolve deadlines come from the priority's SLA policy at that moment; later SLA changes leave existing tickets alone.
- An asset reference is kept only for categories that link an asset. Attachments must be files already claimed in
  the files service (their URL starts with the catalogue's file prefix), at most `ITSM_MAX_ATTACHMENTS`.
- Requesters may only use the requester transitions, only on their own tickets, and cannot comment on a closed or
  cancelled ticket. Another employee's ticket answers 404, never 403.
- The first IT transition or comment sets `firstResponseAt`. Assigning needs an assignee. Reopening clears
  `resolvedAt`.
- Internal notes and IT identities (event actors, requester e-mail, assignee ID) are never returned to requesters;
  IT comments are signed `ITSM_IT_DISPLAY_NAME`.

## Requests and authentication

| Path                  | Caller                                           | Authorization                                                     |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| `/v1/itsm/requests/*` | The admin app's back end, with its service token | Caller listed in `ITSM_REQUEST_CALLERS`; requester in the request |
| `/v1/itsm/desk/*`     | IT staff, with IT-realm access tokens (identity) | `contracts/catalog/it-access.json` (`tickets`, `ticket_settings`) |

Desk permissions: reading needs `tickets:read`; transitions and comments `tickets:edit`, and the assign transition
also `tickets:assign`; SLA targets `ticket_settings:read` / `ticket_settings:edit`. The gateway routes
`/v1/itsm/requests/` now; `/v1/itsm/desk/` is added to the route table with the IT dashboard, once identity serves the
IT realm (user routes need `GATEWAY_IDENTITY_STATUS_URL`).

Lists are newest first and paged with an opaque `cursor` (`ITSM_DEFAULT_PAGE_SIZE`, at most `ITSM_MAX_PAGE_SIZE`).

## Running

The binary supports `serve`, `worker`, `migrate` and `healthcheck`. Compose runs `itsm-migrate`, then `itsm` (admin
listener at `127.0.0.1:9083`) and `itsm-worker`. See [CONFIG](../../../docs/backend/CONFIG.md) for every setting.
No events are published or consumed yet; notifications and the HR offboarding ticket arrive with `notify` and `hr`.

## Jobs

`itsm.mark_sla_breaches` runs every `ITSM_BREACH_INTERVAL` on River. It flags open tickets past their resolve deadline
in batches of `ITSM_BREACH_BATCH` (`FOR UPDATE SKIP LOCKED`), so overlapping runs never double-count; a flagged ticket
is never flagged again.

## Runbook

- Readiness failing: check database connectivity (`/readyz` names the failing check).
- A requester gets 403 on every call: the calling app is not in `ITSM_REQUEST_CALLERS`, or its key is missing from the
  service key set.
- `transition_not_allowed` (409): the transition does not start from the ticket's status in the catalogue.
- Correlate a failing UI action with `X-Request-ID` across gateway and itsm logs.

## Verification

From `backend/`, run `go test -race ./services/itsm/... ./pkg/authz/...`. The integration tests start a disposable
Postgres, run the migrations and check every response against the OpenAPI document.
