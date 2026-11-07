# Event schemas

One JSON Schema per event and version (`<service>.<entity>.<verb>.v<version>.json`, [ADR 0003](../../docs/adr/0003-events-outbox-nats.md)).
A service writes the event to its outbox in the same transaction as the change (`backend/pkg/outbox`); the relay
publishes it to the NATS JetStream stream `EVENTS` with the event ID as the message ID. Delivery is at least once:
consumers record handled IDs (`outbox.Handled`). Payloads never carry credentials, secrets or free-form code.

A change that breaks a consumer gets a new version file; the old one stays until no consumer reads it. Each service's
tests check that every event it emits has a schema here and matches it.
