# 0009 — S3-compatible object storage instead of Supabase Storage

- Status: Accepted (2026-11-01)

## Decision

- The `files` service stores objects through one S3 interface: MinIO locally and in CI, any S3-compatible provider in production (endpoint, region, buckets and credentials come from configuration).
- Browsers upload and download with short-lived presigned URLs; the service checks type, size and permission and verifies the stored bytes.
- A one-off tool copies existing Supabase bucket objects into S3.
