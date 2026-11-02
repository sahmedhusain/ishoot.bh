# notify service

Delivers the platform's e-mail and WhatsApp messages. Callers queue a message; a worker sends it through the configured
provider, retries what may pass later, and announces each outcome as an event ([ADR 0003](../../../docs/adr/0003-events-outbox-nats.md)),
which the audit trail records. IT watches the queue, sends failed messages again and sends test messages from the IT
dashboard (**Notifications**). Owns the `notify` schema: `message`, `attachment`, the outbox and River's tables. The
HTTP contract is [api/openapi.yaml](api/openapi.yaml).

## Sending

`POST /v1/notify/messages` (service tokens; callers in `NOTIFY_SEND_CALLERS`) queues one message with the caller's
`idempotencyKey`: the same caller and key return the first message instead of sending again. The message and its
delivery job are written in one transaction. In the apps, `@platform/email`'s `sendEmail` queues through this
endpoint (one message per recipient), so every e-mail path uses it; the admin's scheduled job hands the queued
`EmailJob` rows over with their event keys. Service-desk WhatsApp replies use it too, and fall back to a `wa.me` link
for the agent when notify refuses the message within a few seconds.

Rules: an e-mail needs one address, a one-line subject and text or HTML, with up to 10 attachments
(`NOTIFY_MAX_ATTACHMENT_BYTES`, sent base64-encoded within the gateway's 11 MB limit). A WhatsApp message is text only
(4,096 characters) to a number with its country code. Events never carry the recipient or the message.

## Delivery

`worker` runs a River queue (`NOTIFY_WORKERS`). Each attempt sends through the channel's provider:

| Channel  | Provider                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| e-mail   | `NOTIFY_EMAIL_PROVIDER=integration`: Resend, with the credentials IT saved (the message ID is Resend's idempotency key); `smtp`: any SMTP server (Mailpit locally) |
| WhatsApp | The WhatsApp Cloud API (`NOTIFY_WHATSAPP_URL`) with IT's credentials (`integration`), or fixed ones for the sandbox (`static`)                                     |

Credentials kept by the system service are read with notify's own service token (`NOTIFY_SERVICE_KEY`, ADR 0011).
A refusal that retrying cannot fix (an invalid recipient, a 4xx other than 408/429, a missing or switched-off
integration) fails the message at once; anything else is retried with River's back-off up to `NOTIFY_MAX_ATTEMPTS`,
then the message fails. IT can send a failed message again once the cause is fixed.

## Requests

| Path                                                         | Caller                           | Authorization           |
| ------------------------------------------------------------ | -------------------------------- | ----------------------- |
| `POST /v1/notify/messages`                                   | Apps' back ends (service tokens) | `NOTIFY_SEND_CALLERS`   |
| `GET /v1/notify/messages/{id}`                               | The caller that queued it        | `NOTIFY_SEND_CALLERS`   |
| `GET /v1/notify/desk/messages`, `/summary`, `/messages/{id}` | IT staff (IT-realm tokens)       | `notifications:read`    |
| `POST /v1/notify/desk/messages/{id}/retry`, `/test`          | IT staff                         | `notifications:execute` |

IT auditors have no access: messages hold personal data.

## Running

`serve`, `worker`, `migrate` and `healthcheck`. Compose runs `notify-migrate`, then `notify` (admin listener at
`127.0.0.1:9086`) and `notify-worker`, which also publishes the outbox. Locally e-mail goes to Mailpit and WhatsApp to
the sandbox; nothing leaves the machine.

## Verification

From `backend/`, run `go test -race ./services/notify/...` (real Postgres, River and Mailpit; responses are checked
against the OpenAPI document).
