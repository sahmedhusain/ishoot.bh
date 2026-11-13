-- +goose Up
CREATE TABLE IF NOT EXISTS cms.portfolio_category (
id TEXT PRIMARY KEY,
slug TEXT UNIQUE,
name_en TEXT,
name_ar TEXT,
display_order INTEGER
);

CREATE TABLE IF NOT EXISTS cms.portfolio_item (
id TEXT PRIMARY KEY,
category_id TEXT,
slug TEXT UNIQUE,
title_en TEXT,
title_ar TEXT,
client_name TEXT,
year INTEGER,
subtitle_en TEXT,
subtitle_ar TEXT,
price DECIMAL,
price_note_en TEXT,
price_note_ar TEXT,
location TEXT,
external_url TEXT
);

CREATE TABLE IF NOT EXISTS cms.website_content (
id TEXT PRIMARY KEY,
draft JSONB,
published JSONB,
previous JSONB,
revision INTEGER,
published_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms.cms_page (
id TEXT PRIMARY KEY,
slug TEXT UNIQUE,
page_type TEXT,
title_en TEXT,
title_ar TEXT,
seo_title_en TEXT,
seo_title_ar TEXT,
seo_description_en TEXT,
seo_description_ar TEXT
);

CREATE TABLE IF NOT EXISTS cms.cms_article (
id TEXT PRIMARY KEY,
slug TEXT UNIQUE,
title_en TEXT,
title_ar TEXT,
excerpt_en TEXT,
excerpt_ar TEXT,
body_en JSONB,
body_ar JSONB,
body_html_en TEXT,
body_html_ar TEXT,
cover_url TEXT,
category TEXT,
author_id TEXT,
author_name TEXT,
status TEXT,
publish_at TIMESTAMPTZ,
featured BOOLEAN,
seo_title_en TEXT,
seo_title_ar TEXT,
seo_description_en TEXT,
seo_description_ar TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
is_sample BOOLEAN
);

CREATE TABLE IF NOT EXISTS cms.social_link (
id TEXT PRIMARY KEY,
platform TEXT,
url TEXT,
icon TEXT,
is_active BOOLEAN,
display_order INTEGER,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms.social_insight_snapshot (
id TEXT PRIMARY KEY,
platform TEXT,
source_provider TEXT,
source_account_id TEXT,
period_days INTEGER,
period_start TIMESTAMPTZ,
period_end TIMESTAMPTZ,
time_zone TEXT,
metrics JSONB,
native_metrics JSONB,
recorded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cms.social_post (
id TEXT PRIMARY KEY,
platform TEXT,
external_id TEXT,
source_provider TEXT,
source_account_id TEXT,
caption TEXT,
media_type TEXT,
permalink TEXT,
thumbnail_url TEXT,
published_at TIMESTAMPTZ,
likes DOUBLE PRECISION,
comments DOUBLE PRECISION,
shares DOUBLE PRECISION,
views DOUBLE PRECISION,
reach DOUBLE PRECISION,
saves DOUBLE PRECISION,
fetched_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms.social_post_snapshot (
id TEXT PRIMARY KEY,
post_id TEXT,
source_account_id TEXT,
recorded_at TIMESTAMPTZ,
counters JSONB
);

CREATE TABLE IF NOT EXISTS cms.social_content_plan (
id TEXT PRIMARY KEY,
title TEXT,
caption TEXT,
media_url TEXT,
scheduled_for TIMESTAMPTZ,
status TEXT,
published_url TEXT,
assignee_id TEXT,
created_by_id TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms.social_metric (
id TEXT PRIMARY KEY,
platform TEXT,
metric_type TEXT,
value DOUBLE PRECISION,
source_provider TEXT,
source_account_id TEXT,
recorded_at TIMESTAMPTZ,
is_stale BOOLEAN,
error_status TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down