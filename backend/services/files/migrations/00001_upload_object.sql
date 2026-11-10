-- +goose Up
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
CREATE INDEX IF NOT EXISTS upload_object_unclaimed_expires_at_idx ON files.upload_object (expires_at)
    WHERE claimed_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS files.upload_object;
