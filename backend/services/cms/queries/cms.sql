-- name: GetPageBySlug :one
SELECT * FROM cms.page WHERE slug = $1 LIMIT 1;

-- name: GetPageByID :one
SELECT * FROM cms.page WHERE id = $1 LIMIT 1;

-- name: ListVisiblePages :many
SELECT * FROM cms.page WHERE is_visible = true ORDER BY sort_order ASC, title_en ASC;

-- name: ListAllPages :many
SELECT * FROM cms.page ORDER BY sort_order ASC, created_at DESC;

-- name: CreatePage :one
INSERT INTO cms.page (
    id, slug, page_type, title_en, title_ar,
    seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
    blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13, $14, now(), now()
) RETURNING *;

-- name: UpdatePage :one
UPDATE cms.page SET
    slug = $2,
    page_type = $3,
    title_en = $4,
    title_ar = $5,
    seo_title_en = $6,
    seo_title_ar = $7,
    seo_description_en = $8,
    seo_description_ar = $9,
    blocks = $10,
    is_visible = $11,
    in_header = $12,
    in_footer = $13,
    sort_order = $14,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeletePage :exec
DELETE FROM cms.page WHERE id = $1;

-- name: GetArticleBySlug :one
SELECT * FROM cms.article WHERE slug = $1 LIMIT 1;

-- name: GetArticleByID :one
SELECT * FROM cms.article WHERE id = $1 LIMIT 1;

-- name: ListPublishedArticles :many
SELECT * FROM cms.article
WHERE status = 'published' AND (publish_at IS NULL OR publish_at <= now())
ORDER BY featured DESC, publish_at DESC NULLS LAST, created_at DESC;

-- name: ListAllArticles :many
SELECT * FROM cms.article
ORDER BY created_at DESC;

-- name: CreateArticle :one
INSERT INTO cms.article (
    id, slug, title_en, title_ar, excerpt_en, excerpt_ar,
    body_en, body_ar, body_html_en, body_html_ar, cover_url,
    category, tags, author_name, status, publish_at, featured,
    seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11,
    $12, $13, $14, $15, $16, $17,
    $18, $19, $20, $21,
    now(), now()
) RETURNING *;

-- name: UpdateArticle :one
UPDATE cms.article SET
    slug = $2,
    title_en = $3,
    title_ar = $4,
    excerpt_en = $5,
    excerpt_ar = $6,
    body_en = $7,
    body_ar = $8,
    body_html_en = $9,
    body_html_ar = $10,
    cover_url = $11,
    category = $12,
    tags = $13,
    author_name = $14,
    status = $15,
    publish_at = $16,
    featured = $17,
    seo_title_en = $18,
    seo_title_ar = $19,
    seo_description_en = $20,
    seo_description_ar = $21,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteArticle :exec
DELETE FROM cms.article WHERE id = $1;

-- name: ListApprovedReviews :many
SELECT * FROM cms.review WHERE is_approved = true ORDER BY sort_order ASC, created_at DESC;

-- name: ListAllReviews :many
SELECT * FROM cms.review ORDER BY sort_order ASC, created_at DESC;

-- name: CreateReview :one
INSERT INTO cms.review (
    id, author_en, author_ar, company_en, company_ar,
    quote_en, quote_ar, rating, is_approved, sort_order, year, created_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10, $11, now()
) RETURNING *;

-- name: UpdateReview :one
UPDATE cms.review SET
    author_en = $2,
    author_ar = $3,
    company_en = $4,
    company_ar = $5,
    quote_en = $6,
    quote_ar = $7,
    rating = $8,
    is_approved = $9,
    sort_order = $10,
    year = $11
WHERE id = $1
RETURNING *;

-- name: DeleteReview :exec
DELETE FROM cms.review WHERE id = $1;

-- name: ListPublishedFAQs :many
SELECT * FROM cms.faq WHERE is_published = true ORDER BY sort_order ASC, created_at ASC;

-- name: ListAllFAQs :many
SELECT * FROM cms.faq ORDER BY sort_order ASC, created_at ASC;

-- name: CreateFAQ :one
INSERT INTO cms.faq (
    id, question_en, question_ar, answer_en, answer_ar,
    category, is_published, sort_order, created_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, now()
) RETURNING *;

-- name: UpdateFAQ :one
UPDATE cms.faq SET
    question_en = $2,
    question_ar = $3,
    answer_en = $4,
    answer_ar = $5,
    category = $6,
    is_published = $7,
    sort_order = $8
WHERE id = $1
RETURNING *;

-- name: DeleteFAQ :exec
DELETE FROM cms.faq WHERE id = $1;

-- name: ListStatistics :many
SELECT * FROM cms.statistic ORDER BY sort_order ASC, id ASC;

-- name: UpsertStatistic :one
INSERT INTO cms.statistic (
    id, metric_value, label_en, label_ar, sub_label_en, sub_label_ar, icon, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) ON CONFLICT (id) DO UPDATE SET
    metric_value = EXCLUDED.metric_value,
    label_en = EXCLUDED.label_en,
    label_ar = EXCLUDED.label_ar,
    sub_label_en = EXCLUDED.sub_label_en,
    sub_label_ar = EXCLUDED.sub_label_ar,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order
RETURNING *;

-- name: DeleteStatistic :exec
DELETE FROM cms.statistic WHERE id = $1;

-- name: GetContentSnapshot :one
SELECT * FROM cms.content_snapshot WHERE id = $1 LIMIT 1;

-- name: UpsertContentDraft :one
INSERT INTO cms.content_snapshot (id, draft, revision, updated_at)
VALUES ($1, $2, $3, now())
ON CONFLICT (id) DO UPDATE SET
    draft = EXCLUDED.draft,
    revision = cms.content_snapshot.revision + 1,
    updated_at = now()
RETURNING *;

-- name: PublishContentSnapshot :one
INSERT INTO cms.content_snapshot (id, draft, published, revision, published_at, updated_at)
VALUES ($1, $2, $2, 1, now(), now())
ON CONFLICT (id) DO UPDATE SET
    published = EXCLUDED.draft,
    published_at = now(),
    updated_at = now()
RETURNING *;
