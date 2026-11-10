package sqlcdb
import (
	"context"
	"encoding/json"
	"time"
)
const getSite = `-- name: GetSite :one
SELECT id, website_domain, admin_domain, code, updated_at, updated_by FROM system.site_setting WHERE id
`
func (q *Queries) GetSite(ctx context.Context) (SystemSiteSetting, error) {
	row := q.db.QueryRow(ctx, getSite)
	var i SystemSiteSetting
	err := row.Scan(
		&i.ID,
		&i.WebsiteDomain,
		&i.AdminDomain,
		&i.Code,
		&i.UpdatedAt,
		&i.UpdatedBy,
	)
	return i, err
}
const setSiteCode = `-- name: SetSiteCode :exec
INSERT INTO system.site_setting (id, code, updated_by, updated_at)
VALUES (true, $1, $2, $3)
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
`
type SetSiteCodeParams struct {
	Code		json.RawMessage
	UpdatedBy	*string
	UpdatedAt	time.Time
}
func (q *Queries) SetSiteCode(ctx context.Context, arg SetSiteCodeParams) error {
	_, err := q.db.Exec(ctx, setSiteCode, arg.Code, arg.UpdatedBy, arg.UpdatedAt)
	return err
}
const setSiteDomains = `-- name: SetSiteDomains :exec
INSERT INTO system.site_setting (id, website_domain, admin_domain, updated_by, updated_at)
VALUES (true, $1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE SET website_domain = EXCLUDED.website_domain, admin_domain = EXCLUDED.admin_domain,
    updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
`
type SetSiteDomainsParams struct {
	WebsiteDomain	*string
	AdminDomain	*string
	UpdatedBy	*string
	UpdatedAt	time.Time
}
func (q *Queries) SetSiteDomains(ctx context.Context, arg SetSiteDomainsParams) error {
	_, err := q.db.Exec(ctx, setSiteDomains,
		arg.WebsiteDomain,
		arg.AdminDomain,
		arg.UpdatedBy,
		arg.UpdatedAt,
	)
	return err
}
