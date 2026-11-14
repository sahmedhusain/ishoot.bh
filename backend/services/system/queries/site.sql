-- name: GetSite :one
SELECT * FROM system.site_setting WHERE id;

-- name: SetSiteDomains :exec
INSERT INTO system.site_setting (id, website_domain, admin_domain, updated_by, updated_at)
VALUES (true, @website_domain, @admin_domain, @updated_by, @updated_at)
ON CONFLICT (id) DO UPDATE SET website_domain = EXCLUDED.website_domain, admin_domain = EXCLUDED.admin_domain,
    updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;

-- name: SetSiteCode :exec
INSERT INTO system.site_setting (id, code, updated_by, updated_at)
VALUES (true, @code, @updated_by, @updated_at)
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
