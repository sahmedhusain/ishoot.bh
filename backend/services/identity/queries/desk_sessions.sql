-- name: ListDeskSessions :many
SELECT f.id, f.realm, f.subject_id, a.email, f.created_at, f.expires_at, f.revoked_at
FROM identity.session_family f
LEFT JOIN identity.account a ON a.realm=f.realm AND a.subject_id=f.subject_id
WHERE (sqlc.arg(realm)::text = '' OR f.realm = sqlc.arg(realm))
  AND (sqlc.arg(subject_id)::text = '' OR f.subject_id = sqlc.arg(subject_id))
  AND f.id > sqlc.arg(cursor)::uuid
ORDER BY f.id LIMIT sqlc.arg(row_limit)::int;
