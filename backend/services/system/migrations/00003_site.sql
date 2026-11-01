-- The website's technical settings, managed by IT: the public website's domain, the admin's own domain, and the
-- site-wide analytics ids and custom code. One row. The Prisma migration moves existing values here from
-- public."CompanySetting" and the website content, so statements are idempotent.

-- +goose Up
CREATE TABLE IF NOT EXISTS system.site_setting (
    id             boolean     NOT NULL DEFAULT true,
    website_domain text,
    admin_domain   text,
    code           jsonb       NOT NULL DEFAULT '{}'::jsonb,
    updated_at     timestamptz NOT NULL DEFAULT now(),
    updated_by     text,
    CONSTRAINT site_setting_pkey PRIMARY KEY (id),
    CONSTRAINT site_setting_single_row CHECK (id),
    CONSTRAINT site_setting_domains_differ CHECK (website_domain IS NULL OR website_domain IS DISTINCT FROM admin_domain)
);

-- +goose Down
DROP TABLE IF EXISTS system.site_setting;
