-- name: StaffPermissionGrants :many
SELECT resource,action,allowed FROM identity.staff_permission WHERE role_id=$1;
-- name: StaffRoleScopes :many
SELECT area,scope FROM identity.staff_role_scope WHERE role_id=$1;
-- name: StaffPermissionOverrides :one
SELECT permission_overrides FROM identity.staff_access WHERE realm='staff' AND subject_id=$1;
-- name: StaffAccountAuthorization :one
SELECT roles,active FROM identity.account WHERE realm='staff' AND subject_id=$1;
