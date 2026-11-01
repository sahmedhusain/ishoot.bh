# 0009 — S3-compatible object storage instead of Supabase Storage

- Status: Accepted (2026-11-01), revised the same day for phase 2

## Decision

- The `files` service stores objects through one S3 interface: SeaweedFS locally and in CI, any S3-compatible provider in production (endpoint, region, buckets and credentials come from configuration).
- Buckets stay private: no bucket is ever exposed to browsers. Uploads and downloads stream through the apps' own
  routes and the `files` service. That keeps the browser flow and its same-origin checks unchanged, and needs no
  CORS rules or public storage endpoint. Files are limited to 10 MB (configurable), so streaming costs little.
  Public assets (brand files, website media) are served with long-lived cache headers, because their names never
  change.
- The service checks the file's type from its first bytes, its size and its owner before it stores anything, and
  checks the stored object again when the upload is claimed.
- SeaweedFS runs as the local and CI S3 server. MinIO no longer publishes community images.
- `backend/tools/storage-copy` copies existing objects (Supabase buckets through their S3 protocol, or the local
  upload folder) into the new buckets.
