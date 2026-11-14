package sqlcdb

import (
	"context"
)

const deliveredProfileProjection = `-- name: DeliveredProfileProjection :exec
UPDATE identity.profile_projection SET delivered_version=GREATEST(delivered_version,$1::bigint)
WHERE realm=$2 AND subject_id=$3 AND $1::bigint<=version
`

type DeliveredProfileProjectionParams struct {
	Version   int64  `json:"version"`
	Realm     string `json:"realm"`
	SubjectID string `json:"subjectId"`
}

func (q *Queries) DeliveredProfileProjection(ctx context.Context, arg DeliveredProfileProjectionParams) error {
	_, err := q.db.Exec(ctx, deliveredProfileProjection, arg.Version, arg.Realm, arg.SubjectID)
	return err
}

const pendingProfileProjections = `-- name: PendingProfileProjections :many
SELECT p.realm,p.subject_id,p.version,p.deleted,a.email,a.roles,a.active,s.display_name,s.permission_overrides,r.name_en AS role_name_en,r.name_ar AS role_name_ar,r.is_system AS role_system,r.revision AS role_version
FROM identity.profile_projection p
LEFT JOIN identity.account a ON a.realm=p.realm AND a.subject_id=p.subject_id
LEFT JOIN identity.staff_access s ON s.realm=p.realm AND s.subject_id=p.subject_id
LEFT JOIN identity.staff_role r ON r.id=a.roles[1]
WHERE p.delivered_version < p.version ORDER BY p.updated_at,p.realm,p.subject_id LIMIT $1
`

type PendingProfileProjectionsRow struct {
	Realm               string   `json:"realm"`
	SubjectID           string   `json:"subjectId"`
	Version             int64    `json:"version"`
	Deleted             bool     `json:"deleted"`
	Email               *string  `json:"email"`
	Roles               []string `json:"roles"`
	Active              *bool    `json:"active"`
	DisplayName         *string  `json:"displayName"`
	PermissionOverrides []byte   `json:"permissionOverrides"`
	RoleNameEn          *string  `json:"roleNameEn"`
	RoleNameAr          *string  `json:"roleNameAr"`
	RoleSystem          *bool    `json:"roleSystem"`
	RoleVersion         *int64   `json:"roleVersion"`
}

func (q *Queries) PendingProfileProjections(ctx context.Context, limit int32) ([]PendingProfileProjectionsRow, error) {
	rows, err := q.db.Query(ctx, pendingProfileProjections, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []PendingProfileProjectionsRow
	for rows.Next() {
		var i PendingProfileProjectionsRow
		if err := rows.Scan(
			&i.Realm,
			&i.SubjectID,
			&i.Version,
			&i.Deleted,
			&i.Email,
			&i.Roles,
			&i.Active,
			&i.DisplayName,
			&i.PermissionOverrides,
			&i.RoleNameEn,
			&i.RoleNameAr,
			&i.RoleSystem,
			&i.RoleVersion,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
