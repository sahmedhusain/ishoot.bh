-- name: PendingProfileProjections :many
SELECT p.realm,p.subject_id,p.version,p.deleted,a.email,a.roles,a.active,s.display_name,s.permission_overrides,r.name_en AS role_name_en,r.name_ar AS role_name_ar,r.is_system AS role_system,r.revision AS role_version
FROM identity.profile_projection p
LEFT JOIN identity.account a ON a.realm=p.realm AND a.subject_id=p.subject_id
LEFT JOIN identity.staff_access s ON s.realm=p.realm AND s.subject_id=p.subject_id
LEFT JOIN identity.staff_role r ON r.id=a.roles[1]
WHERE p.delivered_version < p.version ORDER BY p.updated_at,p.realm,p.subject_id LIMIT $1;
-- name: DeliveredProfileProjection :exec
UPDATE identity.profile_projection SET delivered_version=GREATEST(delivered_version,@version::bigint)
WHERE realm=@realm AND subject_id=@subject_id AND @version::bigint<=version;
