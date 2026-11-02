# workflow service

Workflow automation: approval requests and decisions, digital signatures, letter templates, official letters, operational tasks, and calendar events.
Owns the `workflow` schema: `approval_request`, `approval_decision`, `signature`, `letter_template`, `letter`, `task`, `calendar_event`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Approvals Engine**: Multi-step approval workflows across quotes, invoices, leaves, and expenses.
- **Digital Signatures**: Audit-tracked signing sessions for internal staff and external clients.
- **Official Letters & Correspondence**: Standardized company letters, numbering sequences, and templates.
- **Tasks & Collaboration**: Project task tracking, status transitions, and assignments.
- **Calendar**: Shared company calendar events, milestones, and deadlines.
- **Outbox Events**: Emits `workflow.approval.requested.v1`, `workflow.approval.decided.v1`, `workflow.document.signed.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/workflow/approvals` | Admin app | `approvals:read` |
| `POST /v1/workflow/approvals` | Admin app | `approvals:edit` |
| `POST /v1/workflow/approvals/{id}/decide` | Admin app | `approvals:edit` |
| `GET /v1/workflow/signatures` | Admin app | `signatures:read` |
| `POST /v1/workflow/signatures` | Admin app | `signatures:edit` |
| `GET /v1/workflow/letters` | Admin app | `letters:read` |
| `POST /v1/workflow/letters` | Admin app | `letters:edit` |
| `GET /v1/workflow/tasks` | Admin app | `tasks:read` |
| `POST /v1/workflow/tasks` | Admin app | `tasks:edit` |
| `GET /v1/workflow/calendar` | Admin app | `calendar:read` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/workflow/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
