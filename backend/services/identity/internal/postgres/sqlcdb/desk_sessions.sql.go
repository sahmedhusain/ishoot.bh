package sqlcdb
import (
	"context"
	"time"
)
const listDeskSessions = `-- name: ListDeskSessions :many
SELECT f.id, f.realm, f.subject_id, a.email, f.created_at, f.expires_at, f.revoked_at
FROM identity.session_family f
LEFT JOIN identity.account a ON a.realm=f.realm AND a.subject_id=f.subject_id
WHERE ($1::text = '' OR f.realm = $1)
  AND ($2::text = '' OR f.subject_id = $2)
  AND f.id > $3::uuid
ORDER BY f.id LIMIT $4::int
`
type ListDeskSessionsParams struct {
	Realm		string
	SubjectID	string
	Cursor		string
	RowLimit	int32
}
type ListDeskSessionsRow struct {
	ID		string
	Realm		string
	SubjectID	string
	Email		*string
	CreatedAt	time.Time
	ExpiresAt	time.Time
	RevokedAt	*time.Time
}
func (q *Queries) ListDeskSessions(ctx context.Context, arg ListDeskSessionsParams) ([]ListDeskSessionsRow, error) {
	rows, err := q.db.Query(ctx, listDeskSessions,
		arg.Realm,
		arg.SubjectID,
		arg.Cursor,
		arg.RowLimit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListDeskSessionsRow
	for rows.Next() {
		var i ListDeskSessionsRow
		if err := rows.Scan(
			&i.ID,
			&i.Realm,
			&i.SubjectID,
			&i.Email,
			&i.CreatedAt,
			&i.ExpiresAt,
			&i.RevokedAt,
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
