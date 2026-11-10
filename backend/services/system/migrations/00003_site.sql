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
