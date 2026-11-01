# Architecture decision records

Each record states one decision, why it was made and what it costs. Records are never edited after they are accepted; a later record supersedes an earlier one.

| #                                           | Decision                                                  | Status   |
| ------------------------------------------- | --------------------------------------------------------- | -------- |
| [0001](0001-go-echo-microservices.md)       | Backend in Go with Echo, one service per business domain  | Accepted |
| [0002](0002-postgres-schema-per-service.md) | Plain PostgreSQL, one schema and one role per service     | Accepted |
| [0003](0003-events-outbox-nats.md)          | Transactional outbox and NATS JetStream for events        | Accepted |
| [0004](0004-background-jobs-river.md)       | River for background and scheduled jobs                   | Accepted |
| [0005](0005-identity-realms.md)             | One identity service with three separate realms           | Accepted |
| [0006](0006-openapi-first.md)               | OpenAPI-first contracts and a generated TypeScript client | Accepted |
| [0007](0007-shared-catalogue.md)            | One catalogue for constants shared by Go and TypeScript   | Accepted |
| [0008](0008-phased-migration.md)            | Phased migration, one domain at a time                    | Accepted |
| [0009](0009-object-storage-s3.md)           | S3-compatible object storage instead of Supabase Storage  | Accepted |
| [0010](0010-it-dashboard.md)                | A separate IT dashboard and IT ticketing for employees    | Accepted |
| [0011](0011-service-authentication.md)      | App service tokens during the phased migration            | Accepted |
