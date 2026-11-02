-- name: ListStaffAccounts :many
SELECT a.subject_id,a.email,a.roles,a.active,a.mfa_enabled,a.created_at,a.last_login_at,s.display_name
FROM identity.account a LEFT JOIN identity.staff_access s ON s.realm=a.realm AND s.subject_id=a.subject_id
WHERE a.realm='staff' AND a.subject_id> @cursor::text ORDER BY a.subject_id LIMIT @row_limit::int;
-- name: StaffAccountDraft :one
SELECT a.subject_id,a.email,a.roles,a.active,s.permission_overrides,s.data_scopes,s.display_name
FROM identity.account a JOIN identity.staff_access s ON s.realm=a.realm AND s.subject_id=a.subject_id
WHERE a.realm='staff' AND a.subject_id=$1;
-- name: SaveStaffAccountDraft :exec
INSERT INTO identity.staff_access(realm,subject_id,display_name,permission_overrides,data_scopes,updated_at)
VALUES ('staff',@subject_id,@display_name,@permission_overrides::jsonb,@data_scopes::jsonb,@now)
ON CONFLICT(realm,subject_id) DO UPDATE SET display_name=EXCLUDED.display_name,permission_overrides=EXCLUDED.permission_overrides,data_scopes=EXCLUDED.data_scopes,updated_at=EXCLUDED.updated_at;
-- name: StaffScopeOverrides :one
SELECT data_scopes FROM identity.staff_access WHERE realm='staff' AND subject_id=$1;
-- name: ListStaffRoles :many
SELECT * FROM identity.staff_role WHERE id> @cursor::text ORDER BY id LIMIT @row_limit::int;
-- name: StaffRole :one
SELECT * FROM identity.staff_role WHERE id=$1;
-- name: SaveStaffRole :exec
INSERT INTO identity.staff_role(id,name_en,name_ar,is_system) VALUES ($1,$2,$3,false)
ON CONFLICT(id) DO UPDATE SET name_en=EXCLUDED.name_en,name_ar=EXCLUDED.name_ar,revision=identity.staff_role.revision+1;
-- name: ClearStaffRoleGrants :exec
DELETE FROM identity.staff_permission WHERE role_id=$1;
-- name: SaveStaffRoleGrant :exec
INSERT INTO identity.staff_permission(id,role_id,resource,action,allowed) VALUES ($1,$2,$3,$4,$5);
-- name: ClearStaffRoleScopes :exec
DELETE FROM identity.staff_role_scope WHERE role_id=$1;
-- name: SaveStaffRoleScope :exec
INSERT INTO identity.staff_role_scope(role_id,area,scope) VALUES ($1,$2,$3);
-- name: CountStaffRoleAssignments :one
SELECT count(*) FROM identity.account WHERE realm='staff' AND roles @> ARRAY[$1::text];
-- name: DeleteStaffRole :exec
DELETE FROM identity.staff_role WHERE id=$1 AND NOT is_system;
-- name: RevokeStaffRoleSessions :exec
UPDATE identity.session_family f SET revoked_at=COALESCE(f.revoked_at,@now)
FROM identity.account a WHERE a.realm='staff' AND f.realm=a.realm AND f.subject_id=a.subject_id AND a.roles @> ARRAY[@role_id::text];

-- name: QueueStaffRoleProjections :exec
INSERT INTO identity.profile_projection(realm,subject_id)
SELECT realm,subject_id FROM identity.account WHERE realm='staff' AND roles @> ARRAY[$1::text]
ON CONFLICT(realm,subject_id) DO UPDATE SET version=identity.profile_projection.version+1,updated_at=now();
