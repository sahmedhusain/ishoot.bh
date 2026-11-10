CREATE TABLE IF NOT EXISTS cms.page (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    page_type text NOT NULL DEFAULT 'custom',
    title_en text NOT NULL,
    title_ar text NOT NULL,
    seo_title_en text,
    seo_title_ar text,
    seo_description_en text,
    seo_description_ar text,
    blocks jsonb NOT NULL DEFAULT '[]',
    is_visible boolean NOT NULL DEFAULT true,
    in_header boolean NOT NULL DEFAULT false,
    in_footer boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_sort_idx ON cms.page (sort_order ASC);
CREATE TABLE IF NOT EXISTS cms.article (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    excerpt_en text,
    excerpt_ar text,
    body_en jsonb,
    body_ar jsonb,
    body_html_en text,
    body_html_ar text,
    cover_url text,
    category text NOT NULL DEFAULT 'news',
    tags text[] NOT NULL DEFAULT '{}',
    author_name text,
    status text NOT NULL DEFAULT 'draft',
    publish_at timestamptz,
    featured boolean NOT NULL DEFAULT false,
    seo_title_en text,
    seo_title_ar text,
    seo_description_en text,
    seo_description_ar text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS article_status_idx ON cms.article (status, publish_at DESC);
CREATE TABLE IF NOT EXISTS cms.review (
    id text PRIMARY KEY,
    author_en text NOT NULL,
    author_ar text NOT NULL,
    company_en text,
    company_ar text,
    quote_en text NOT NULL,
    quote_ar text NOT NULL,
    rating integer NOT NULL DEFAULT 5,
    is_approved boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    year text NOT NULL DEFAULT '2026',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cms.faq (
    id text PRIMARY KEY,
    question_en text NOT NULL,
    question_ar text NOT NULL,
    answer_en text NOT NULL,
    answer_ar text NOT NULL,
    category text NOT NULL DEFAULT 'general',
    is_published boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cms.statistic (
    id text PRIMARY KEY,
    metric_value text NOT NULL,
    label_en text NOT NULL,
    label_ar text NOT NULL,
    sub_label_en text,
    sub_label_ar text,
    icon text,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS cms.content_snapshot (
    id text PRIMARY KEY DEFAULT 'main',
    draft jsonb NOT NULL,
    published jsonb,
    revision integer NOT NULL DEFAULT 1,
    published_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TABLE IF EXISTS cms.content_snapshot;
DROP TABLE IF EXISTS cms.statistic;
DROP TABLE IF EXISTS cms.faq;
DROP TABLE IF EXISTS cms.review;
DROP TABLE IF EXISTS cms.article;
DROP TABLE IF EXISTS cms.page;
