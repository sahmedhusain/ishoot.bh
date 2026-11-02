# 0012 — In-app notifications, live updates and presence

- Status: Accepted (2026-11-02)

## Context

The admin app kept in-app notifications in Prisma and polled for them every 30 seconds. There was no sound, no
per-person settings, no way to mute a kind of message, and no live updates anywhere else. People had no profile
picture and no status (available, in a meeting, on leave). The IT dashboard had no notifications at all.

## Decision

- **notify owns the inbox.** `notify.notification` holds every in-app notification for both realms (`staff`, `it`),
  with a category, a priority, read and archive state, and an optional delivery time for reminders. `notify.preference`
  and `notify.mute` hold each person's settings: mute everything until a time, sound on or off (and which sound and how
  loud), pop-ups and desktop notifications, and per category whether it is muted and whether it plays a sound. A muted
  notification is still stored, silently: no sound, pop-up or badge. Security notifications cannot be muted.
- **Categories come from the catalogue** (`contracts/catalog/notifications.json`, ADR 0007). A category either reaches
  people personally (approvals, tasks, leave) or by permission (finance, sales, inventory, the IT desk). A person
  sees and configures only the categories their permissions allow, and loses a role category when the permission goes.
- **Domains still in Prisma hand notifications over.** Their code keeps writing `Notification` rows in its own
  transactions, so a notification never exists for a change that rolled back. The admin server hands pending rows to
  notify every second (`FOR UPDATE SKIP LOCKED`, idempotent by row ID) and marks them handed over. The first run
  migrates every earlier notification with its read and hidden state. This is the same pattern as `EmailJob`; a
  domain that moves to Go creates notifications through notify directly, or notify consumes its events.
- **A new `realtime` service pushes live updates** to browsers over Server-Sent Events, which every current browser
  supports, reconnects by itself and passes through proxies and the gateway. Services publish small, content-free hints
  on NATS core subjects (`live.user.<realm>.<id>`, `live.topic.<topic>`); every realtime replica subscribes and writes
  to its own connections, so it scales horizontally without sticky sessions. Hints carry IDs and counts, never message
  text: the browser fetches what changed through its own app, which checks permissions again. Lost hints are harmless;
  every reconnect starts with a resync.
- **Browsers reach realtime through their own app.** The admin app's `/api/realtime/stream` signs the person in from
  the session cookie, works out the topics their permissions allow and opens the stream with its service token
  (ADR 0011); the IT dashboard forwards the IT account's own token. One tab per browser holds the connection (Web
  Locks) and shares events with the others (BroadcastChannel), so a person with many tabs uses one connection and hears
  one sound. Without those APIs every tab connects on its own.
- **realtime owns presence.** Effective status is, in order: a status the person chose (until it expires), approved
  leave, a calendar meeting, then online, away (idle) or offline from their live connections. Calendar events and
  approved leave are sent to realtime as time windows by the app that owns them. Do not disturb also silences
  notifications.
- **Profile pictures are files.** Bytes go through the files service into the private `avatars` folder, cropped in the
  browser first. A picture given as a link is fetched by the files service (public addresses only, size and type
  checked), never by the browser, so cropping works for any host and nobody's IP address leaks to it. The account keeps
  the picture's address; without one the apps show the person's initials.

## Consequences

- Notifications survive outages of notify: rows wait in Prisma and are handed over when it is back.
- The realtime service holds no message content and no business state except statuses and their windows.
- Sound needs one user gesture per page load (browser autoplay rules); the apps unlock audio on the first click or key.
- Desktop notifications need the person's permission and are unavailable on some mobile browsers; in-app pop-ups and
  sound remain.
- The hand-over adds up to a second of delay for domains still in Prisma.
