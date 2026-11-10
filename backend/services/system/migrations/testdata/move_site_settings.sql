-- +goose Up
CREATE SCHEMA IF NOT EXISTS system;
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
INSERT INTO system.site_setting (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
DO $$
DECLARE
  legacy_website text;
  legacy_admin   text;
  legacy_code    jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'CompanySetting' AND column_name = 'websiteDomain') THEN
    EXECUTE 'SELECT NULLIF(btrim("websiteDomain"), ''''), NULLIF(btrim("adminDomain"), '''')
             FROM public."CompanySetting" ORDER BY singleton LIMIT 1'
      INTO legacy_website, legacy_admin;
    UPDATE system.site_setting s
       SET website_domain = COALESCE(s.website_domain, legacy_website),
           admin_domain   = COALESCE(s.admin_domain, legacy_admin)
     WHERE s.id
       AND COALESCE(s.website_domain, legacy_website) IS DISTINCT FROM COALESCE(s.admin_domain, legacy_admin);

-- +goose Down
ALTER TABLE public."CompanySetting" DROP COLUMN "websiteDomain", DROP COLUMN "adminDomain";
  END IF;
  IF to_regclass('public."WebsiteContent"') IS NOT NULL THEN
    SELECT COALESCE(published -> 'code', draft -> 'code') INTO legacy_code
      FROM public."WebsiteContent" WHERE id = 'main';
    IF jsonb_typeof(legacy_code) = 'object' THEN
      UPDATE system.site_setting
         SET code = jsonb_build_object(
               'googleAnalyticsId', COALESCE(legacy_code ->> 'googleAnalyticsId', ''),
               'metaPixelId',       COALESCE(legacy_code ->> 'metaPixelId', ''),
               'tiktokPixelId',     COALESCE(legacy_code ->> 'tiktokPixelId', ''),
               'headHtml',          COALESCE(legacy_code ->> 'headHtml', ''),
               'bodyHtml',          COALESCE(legacy_code ->> 'bodyHtml', ''))
       WHERE id AND code = '{}'::jsonb;
    END IF;
    UPDATE public."WebsiteContent"
       SET draft = draft - 'code', published = published - 'code', previous = previous - 'code'
     WHERE draft ? 'code' OR published ? 'code' OR previous ? 'code';
  END IF;
END $$;
