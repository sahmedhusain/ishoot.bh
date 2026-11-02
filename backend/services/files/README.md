# Files service

Owns `files.upload_object`, private S3 objects and expired-upload cleanup. Domain attachments remain with their business domain during the migration. The HTTP contract is [api/openapi.yaml](api/openapi.yaml); regenerate the TypeScript client with `npm --prefix packages/api-client run generate` from the repository root.

## Requests and authentication

All `/v1/files` endpoints require a short-lived service token from a trusted app issuer. The gateway and files service verify it independently. Apps authorize the end user before calling this API; it is not a browser-facing authorization API. See [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md#architectural-decisions--core-principles).

- `POST /uploads`: reserve an address with owner, folder, type and size.
- `PUT /uploads/content`: stream the declared bytes for that owner.
- `POST /uploads/verify`: verify ownership, expiry, stored size and magic bytes.
- `POST /uploads/claim`: verify and atomically claim once.
- `POST /uploads/import`: download a file from a link into an upload of the owner (a profile picture given as a link,
  for in-app notifications and presence). Only public http(s) addresses are
  reached: every connection, redirects included, is checked after DNS resolution, up to `FILES_IMPORT_MAX_SIZE` within
  `FILES_IMPORT_TIMEOUT`. The bytes must be a type the folder accepts; the upload expires unless claimed.
- Lookup, read, store and delete endpoints are specified in OpenAPI. Store accepts an explicit address or generates one from the detected type.

The browser uses same-origin Next.js upload and download routes. Both S3 buckets stay private. Public brand assets are exposed through application routes; private downloads require application permission. Folder rules and magic-byte signatures come from `contracts/catalog/files.json`.

## Running

The binary supports `serve`, `worker`, `migrate` and `healthcheck`. Compose starts migrations before the API and worker. The service's `/readyz`, `/livez` and `/metrics` are on its internal admin listener; Compose exposes the API's admin listener at `127.0.0.1:9081` by default.

See [CONFIG](../../../docs/backend/CONFIG.md) for database, authentication, S3, size, expiry and cleanup settings. Bucket creation is enabled in Compose; production buckets should be provisioned before startup. No events are published or consumed in this phase.

## Jobs and failure handling

River runs expired-upload cleanup periodically. A batch locks only expired unclaimed rows using `SKIP LOCKED`, removes their bytes, then removes records. Failures retain the records for retry. Claimed uploads are permanent; they are not automatically removed if a later business transaction fails. Claims across services are not atomic with Prisma writes.

If readiness fails, check database connectivity and access to the private S3 bucket. For upload failures, correlate `X-Request-ID` in gateway and service logs, check declared versus actual bytes, and check S3 write availability. A non-seekable upload cannot be retried internally; the app must resend its bytes.

## Verification

From `backend/`, run `go test -race ./services/files/... ./pkg/objectstore/... ./pkg/migrate/... ./tools/storage-copy/...`. Integration tests start disposable Postgres and SeaweedFS containers and validate HTTP responses against OpenAPI. Never reset a development database to run these tests.
