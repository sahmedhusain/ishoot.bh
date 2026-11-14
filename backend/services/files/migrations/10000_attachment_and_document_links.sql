-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS files.entity_attachment (
    id             text        NOT NULL,
    file_id        text        REFERENCES files.upload_object(id) ON DELETE SET NULL,
    file_url       text        NOT NULL,
    file_name      text        NOT NULL,
    file_size      bigint      NOT NULL DEFAULT 0,
    mime_type      text        NOT NULL DEFAULT 'application/octet-stream',
    entity_type    text        NOT NULL,
    entity_id      text        NOT NULL,
    document_id    text,
    document_type  text,
    relation_kind  text        NOT NULL DEFAULT 'attachment',
    title          text,
    client_id      text,
    employee_id    text,
    project_id     text,
    uploaded_by_id text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT entity_attachment_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_entity_attachment_entity
    ON files.entity_attachment (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_attachment_document_id
    ON files.entity_attachment (document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_attachment_client_id
    ON files.entity_attachment (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_attachment_employee_id
    ON files.entity_attachment (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_attachment_project_id
    ON files.entity_attachment (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_attachment_file_url
    ON files.entity_attachment (file_url);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS files.entity_attachment;
-- +goose StatementEnd
