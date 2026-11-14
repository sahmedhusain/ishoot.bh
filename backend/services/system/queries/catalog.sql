-- name: ListServices :many
SELECT * FROM system.service ORDER BY display_order ASC NULLS LAST, name_en ASC NULLS LAST;

-- name: ListActiveServices :many
SELECT * FROM system.service WHERE is_active IS NOT FALSE ORDER BY display_order ASC NULLS LAST, name_en ASC NULLS LAST;

-- name: GetServiceByID :one
SELECT * FROM system.service WHERE id = $1 LIMIT 1;

-- name: CreateService :one
INSERT INTO system.service (
    id, code, name_en, name_ar, category, description_en, description_ar,
    unit, default_rate, is_active, display_order, is_public, image_url,
    created_at, updated_at, is_sample
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13,
    now(), now(), $14
) RETURNING *;

-- name: UpdateService :one
UPDATE system.service SET
    code = $2,
    name_en = $3,
    name_ar = $4,
    category = $5,
    description_en = $6,
    description_ar = $7,
    unit = $8,
    default_rate = $9,
    is_active = $10,
    display_order = $11,
    is_public = $12,
    image_url = $13,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteService :exec
DELETE FROM system.service WHERE id = $1;

-- name: ListProjects :many
SELECT * FROM system.project ORDER BY created_at DESC;

-- name: GetProjectByID :one
SELECT * FROM system.project WHERE id = $1 LIMIT 1;

-- name: CreateProject :one
INSERT INTO system.project (
    id, code, name, description, status, department_id, owner_id, color,
    start_date, due_date, created_by_id, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, now(), now()
) RETURNING *;

-- name: UpdateProject :one
UPDATE system.project SET
    code = $2,
    name = $3,
    description = $4,
    status = $5,
    department_id = $6,
    owner_id = $7,
    color = $8,
    start_date = $9,
    due_date = $10,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteProject :exec
DELETE FROM system.project WHERE id = $1;
