-- Baseline for the files service. On existing installations the Prisma migration
-- 20261101120000_move_uploads_to_files_service moves "UploadObject" here with its data, so every statement is
-- idempotent and names match what that migration produces.

-- +goose Up
CREATE SCHEMA IF NOT EXISTS files;

CREATE TABLE IF NOT EXISTS files.upload_object (
    id          text        NOT NULL,
    file_url    text        NOT NULL,
    owner_id    text,
    file_name   text        NOT NULL,
    file_size   bigint      NOT NULL,
    mime_type   text        NOT NULL,
    is_public   boolean     NOT NULL DEFAULT false,
    claimed_at  timestamptz,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT upload_object_pkey PRIMARY KEY (id),
    CONSTRAINT upload_object_file_url_key UNIQUE (file_url)
);
CREATE INDEX IF NOT EXISTS upload_object_owner_id_expires_at_idx ON files.upload_object (owner_id, expires_at);
-- Cleanup scans only unclaimed uploads.
CREATE INDEX IF NOT EXISTS upload_object_unclaimed_expires_at_idx ON files.upload_object (expires_at)
    WHERE claimed_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS files.upload_object;
