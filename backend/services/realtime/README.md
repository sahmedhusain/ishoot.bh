# realtime service

Pushes live updates to the apps' browsers and works out people's statuses ([ADR 0012](../../../docs/adr/0012-in-app-notifications-realtime-presence.md)).
Owns the `realtime` schema: `status` (the status each person chose) and `status_window` (meetings and approved leave
the apps send). Who is connected and who is idle lives in Valkey. The HTTP contract is [api/openapi.yaml](api/openapi.yaml).

## Live streams

Browsers open a Server-Sent Events stream through their own app (`/api/realtime/stream` in the admin and the IT
dashboard), which signs the person in and opens `GET /v1/realtime/stream` (service token, with the person's ID and the
topics their permissions allow) or `GET /v1/realtime/me/stream` (an IT account's own token; topics from their roles).
Every event is one JSON object `{type, data}` on a `data:` line: `realtime.ready` first, then hints, a comment line
every `REALTIME_HEARTBEAT`, and `realtime.reconnect` after `REALTIME_MAX_STREAM_AGE` (the browser reconnects at once,
which checks the person again). A stream that falls `REALTIME_BUFFER` hints behind, or whose identity session is revoked
(`identity.session.revoked`), gets `realtime.closed`.

Services publish hints on NATS core subjects with `pkg/live`: `live.user.<realm>.<id>` for one person and
`live.topic.<topic>` for a topic. Every replica subscribes to `live.>` and writes to the streams it holds, so replicas
share nothing and need no sticky sessions. Hints carry IDs and counts only; browsers fetch the content through their
app. The apps publish for domains still in Prisma with `POST /v1/realtime/publish` (never to `presence.*`).

| Hint                         | From     | Meaning                                                      |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| `notification.created`       | notify   | A new notification (`id`, `category`, `priority`, `silent`)   |
| `notification.changed`       | notify   | Read state changed on another device (`unread`)              |
| `notification.preferences`   | notify   | Notification settings or mutes changed                       |
| `presence.changed`           | realtime | Someone's status may have changed (`userId`; none: everyone) |
| `entity.changed`             | apps     | Records of a resource changed (`resource`, `id`)              |

Topics: `presence.<realm>` (every stream), `staff.all`, `staff.res.<resource>` (staff who may read the resource),
`it.tickets` and `it.platform` (IT roles with `tickets:read`, `system_health:read`).

## Statuses

A person's status is, in order: appear offline; leave they chose or approved leave (`leave` windows; `sick` gives Out
sick); a status they chose, while connected; a calendar meeting (`meeting` windows); then the connection itself:
available, away when the browser reports them idle (after five minutes without input), or offline. Statuses and their
names come from [contracts/catalog/presence.json](../../../contracts/catalog/presence.json). Do not disturb also keeps
notifications quiet in the apps.

The admin sends a meeting's or a leave request's window when it is saved (`PUT /v1/realtime/windows`, removed with
`DELETE`) and the full picture of the coming weeks every two minutes (`POST /v1/realtime/windows/sync`), which repairs
anything missed. Every `REALTIME_TICK` the service announces statuses that started or ended by themselves.

## Requests

| Path                                                             | Caller                     | Authorization       |
| ---------------------------------------------------------------- | -------------------------- | ------------------- |
| `GET /v1/realtime/stream`, `POST /publish`, `GET /presence`      | Apps' back ends            | `REALTIME_CALLERS`  |
| `GET/PUT/DELETE /v1/realtime/status`, `POST /activity`           | Apps' back ends, for a person | `REALTIME_CALLERS` |
| `PUT/DELETE /v1/realtime/windows`, `POST /windows/sync`          | Apps' back ends            | `REALTIME_CALLERS`  |
| `GET /v1/realtime/me/stream`, `/me/presence`, `/me/status`, `POST /me/activity` | IT accounts | IT-realm token |

## Running

`serve`, `migrate` and `healthcheck`. Compose runs `realtime-migrate`, then `realtime` (admin listener at
`127.0.0.1:9087`). It needs Postgres, NATS (hints) and Valkey (connections). Streams are long requests: the service and
the gateway lift the write timeout for `Accept: text/event-stream`, and an ingress in front must not buffer
`text/event-stream` responses (the service sends `X-Accel-Buffering: no`). Metric: `realtime_open_streams`.

## Verification

From `backend/`, run `go test -race ./services/realtime/... ./pkg/live/...` (real Postgres; the stream test runs a real
HTTP server whose write timeout is shorter than the wait for a hint).
