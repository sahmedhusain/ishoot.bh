package sqlcdb
import (
	"context"
	"time"
)
const listModuleSettings = `-- name: ListModuleSettings :many
SELECT module_key, enabled, updated_by, updated_at FROM system.module_setting ORDER BY module_key
`
func (q *Queries) ListModuleSettings(ctx context.Context) ([]SystemModuleSetting, error) {
	rows, err := q.db.Query(ctx, listModuleSettings)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SystemModuleSetting
	for rows.Next() {
		var i SystemModuleSetting
		if err := rows.Scan(
			&i.ModuleKey,
			&i.Enabled,
			&i.UpdatedBy,
			&i.UpdatedAt,
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
const setModule = `-- name: SetModule :exec
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (module_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
`
type SetModuleParams struct {
	ModuleKey	string
	Enabled		bool
	UpdatedBy	*string
	UpdatedAt	time.Time
}
func (q *Queries) SetModule(ctx context.Context, arg SetModuleParams) error {
	_, err := q.db.Exec(ctx, setModule,
		arg.ModuleKey,
		arg.Enabled,
		arg.UpdatedBy,
		arg.UpdatedAt,
	)
	return err
}
