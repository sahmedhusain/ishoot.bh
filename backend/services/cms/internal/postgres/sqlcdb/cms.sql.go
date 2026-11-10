package sqlcdb
import (
	"context"
	"encoding/json"
	"time"
)
const createArticle = `-- name: CreateArticle :one
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
) RETURNING id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, body_html_en, body_html_ar, cover_url, category, tags, author_name, status, publish_at, featured, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, created_at, updated_at
`
type CreateArticleParams struct {
	ID			string
	Slug			string
	TitleEn			string
	TitleAr			string
	ExcerptEn		*string
	ExcerptAr		*string
	BodyEn			[]byte
	BodyAr			[]byte
	BodyHtmlEn		*string
	BodyHtmlAr		*string
	CoverUrl		*string
	Category		string
	Tags			[]string
	AuthorName		*string
	Status			string
	PublishAt		*time.Time
	Featured		bool
	SeoTitleEn		*string
	SeoTitleAr		*string
	SeoDescriptionEn	*string
	SeoDescriptionAr	*string
}
func (q *Queries) CreateArticle(ctx context.Context, arg CreateArticleParams) (CmsArticle, error) {
	row := q.db.QueryRow(ctx, createArticle,
		arg.ID,
		arg.Slug,
		arg.TitleEn,
		arg.TitleAr,
		arg.ExcerptEn,
		arg.ExcerptAr,
		arg.BodyEn,
		arg.BodyAr,
		arg.BodyHtmlEn,
		arg.BodyHtmlAr,
		arg.CoverUrl,
		arg.Category,
		arg.Tags,
		arg.AuthorName,
		arg.Status,
		arg.PublishAt,
		arg.Featured,
		arg.SeoTitleEn,
		arg.SeoTitleAr,
		arg.SeoDescriptionEn,
		arg.SeoDescriptionAr,
	)
	var i CmsArticle
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.TitleEn,
		&i.TitleAr,
		&i.ExcerptEn,
		&i.ExcerptAr,
		&i.BodyEn,
		&i.BodyAr,
		&i.BodyHtmlEn,
		&i.BodyHtmlAr,
		&i.CoverUrl,
		&i.Category,
		&i.Tags,
		&i.AuthorName,
		&i.Status,
		&i.PublishAt,
		&i.Featured,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const createFAQ = `-- name: CreateFAQ :one
INSERT INTO cms.faq (
    id, question_en, question_ar, answer_en, answer_ar,
    category, is_published, sort_order, created_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, now()
) RETURNING id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at
`
type CreateFAQParams struct {
	ID		string
	QuestionEn	string
	QuestionAr	string
	AnswerEn	string
	AnswerAr	string
	Category	string
	IsPublished	bool
	SortOrder	int32
}
func (q *Queries) CreateFAQ(ctx context.Context, arg CreateFAQParams) (CmsFaq, error) {
	row := q.db.QueryRow(ctx, createFAQ,
		arg.ID,
		arg.QuestionEn,
		arg.QuestionAr,
		arg.AnswerEn,
		arg.AnswerAr,
		arg.Category,
		arg.IsPublished,
		arg.SortOrder,
	)
	var i CmsFaq
	err := row.Scan(
		&i.ID,
		&i.QuestionEn,
		&i.QuestionAr,
		&i.AnswerEn,
		&i.AnswerAr,
		&i.Category,
		&i.IsPublished,
		&i.SortOrder,
		&i.CreatedAt,
	)
	return i, err
}
const createPage = `-- name: CreatePage :one
INSERT INTO cms.page (
    id, slug, page_type, title_en, title_ar,
    seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
    blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13, $14, now(), now()
) RETURNING id, slug, page_type, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at
`
type CreatePageParams struct {
	ID			string
	Slug			string
	PageType		string
	TitleEn			string
	TitleAr			string
	SeoTitleEn		*string
	SeoTitleAr		*string
	SeoDescriptionEn	*string
	SeoDescriptionAr	*string
	Blocks			json.RawMessage
	IsVisible		bool
	InHeader		bool
	InFooter		bool
	SortOrder		int32
}
func (q *Queries) CreatePage(ctx context.Context, arg CreatePageParams) (CmsPage, error) {
	row := q.db.QueryRow(ctx, createPage,
		arg.ID,
		arg.Slug,
		arg.PageType,
		arg.TitleEn,
		arg.TitleAr,
		arg.SeoTitleEn,
		arg.SeoTitleAr,
		arg.SeoDescriptionEn,
		arg.SeoDescriptionAr,
		arg.Blocks,
		arg.IsVisible,
		arg.InHeader,
		arg.InFooter,
		arg.SortOrder,
	)
	var i CmsPage
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.PageType,
		&i.TitleEn,
		&i.TitleAr,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.Blocks,
		&i.IsVisible,
		&i.InHeader,
		&i.InFooter,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const createReview = `-- name: CreateReview :one
INSERT INTO cms.review (
    id, author_en, author_ar, company_en, company_ar,
    quote_en, quote_ar, rating, is_approved, sort_order, year, created_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10, $11, now()
) RETURNING id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, sort_order, year, created_at
`
type CreateReviewParams struct {
	ID		string
	AuthorEn	string
	AuthorAr	string
	CompanyEn	*string
	CompanyAr	*string
	QuoteEn		string
	QuoteAr		string
	Rating		int32
	IsApproved	bool
	SortOrder	int32
	Year		string
}
func (q *Queries) CreateReview(ctx context.Context, arg CreateReviewParams) (CmsReview, error) {
	row := q.db.QueryRow(ctx, createReview,
		arg.ID,
		arg.AuthorEn,
		arg.AuthorAr,
		arg.CompanyEn,
		arg.CompanyAr,
		arg.QuoteEn,
		arg.QuoteAr,
		arg.Rating,
		arg.IsApproved,
		arg.SortOrder,
		arg.Year,
	)
	var i CmsReview
	err := row.Scan(
		&i.ID,
		&i.AuthorEn,
		&i.AuthorAr,
		&i.CompanyEn,
		&i.CompanyAr,
		&i.QuoteEn,
		&i.QuoteAr,
		&i.Rating,
		&i.IsApproved,
		&i.SortOrder,
		&i.Year,
		&i.CreatedAt,
	)
	return i, err
}
const deleteArticle = `-- name: DeleteArticle :exec
DELETE FROM cms.article WHERE id = $1
`
func (q *Queries) DeleteArticle(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteArticle, id)
	return err
}
const deleteFAQ = `-- name: DeleteFAQ :exec
DELETE FROM cms.faq WHERE id = $1
`
func (q *Queries) DeleteFAQ(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteFAQ, id)
	return err
}
const deletePage = `-- name: DeletePage :exec
DELETE FROM cms.page WHERE id = $1
`
func (q *Queries) DeletePage(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deletePage, id)
	return err
}
const deleteReview = `-- name: DeleteReview :exec
DELETE FROM cms.review WHERE id = $1
`
func (q *Queries) DeleteReview(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteReview, id)
	return err
}
const deleteStatistic = `-- name: DeleteStatistic :exec
DELETE FROM cms.statistic WHERE id = $1
`
func (q *Queries) DeleteStatistic(ctx context.Context, id string) error {
	_, err := q.db.Exec(ctx, deleteStatistic, id)
	return err
}
const getArticleByID = `-- name: GetArticleByID :one
SELECT id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, body_html_en, body_html_ar, cover_url, category, tags, author_name, status, publish_at, featured, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, created_at, updated_at FROM cms.article WHERE id = $1 LIMIT 1
`
func (q *Queries) GetArticleByID(ctx context.Context, id string) (CmsArticle, error) {
	row := q.db.QueryRow(ctx, getArticleByID, id)
	var i CmsArticle
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.TitleEn,
		&i.TitleAr,
		&i.ExcerptEn,
		&i.ExcerptAr,
		&i.BodyEn,
		&i.BodyAr,
		&i.BodyHtmlEn,
		&i.BodyHtmlAr,
		&i.CoverUrl,
		&i.Category,
		&i.Tags,
		&i.AuthorName,
		&i.Status,
		&i.PublishAt,
		&i.Featured,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getArticleBySlug = `-- name: GetArticleBySlug :one
SELECT id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, body_html_en, body_html_ar, cover_url, category, tags, author_name, status, publish_at, featured, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, created_at, updated_at FROM cms.article WHERE slug = $1 LIMIT 1
`
func (q *Queries) GetArticleBySlug(ctx context.Context, slug string) (CmsArticle, error) {
	row := q.db.QueryRow(ctx, getArticleBySlug, slug)
	var i CmsArticle
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.TitleEn,
		&i.TitleAr,
		&i.ExcerptEn,
		&i.ExcerptAr,
		&i.BodyEn,
		&i.BodyAr,
		&i.BodyHtmlEn,
		&i.BodyHtmlAr,
		&i.CoverUrl,
		&i.Category,
		&i.Tags,
		&i.AuthorName,
		&i.Status,
		&i.PublishAt,
		&i.Featured,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getContentSnapshot = `-- name: GetContentSnapshot :one
SELECT id, draft, published, revision, published_at, updated_at FROM cms.content_snapshot WHERE id = $1 LIMIT 1
`
func (q *Queries) GetContentSnapshot(ctx context.Context, id string) (CmsContentSnapshot, error) {
	row := q.db.QueryRow(ctx, getContentSnapshot, id)
	var i CmsContentSnapshot
	err := row.Scan(
		&i.ID,
		&i.Draft,
		&i.Published,
		&i.Revision,
		&i.PublishedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getPageByID = `-- name: GetPageByID :one
SELECT id, slug, page_type, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at FROM cms.page WHERE id = $1 LIMIT 1
`
func (q *Queries) GetPageByID(ctx context.Context, id string) (CmsPage, error) {
	row := q.db.QueryRow(ctx, getPageByID, id)
	var i CmsPage
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.PageType,
		&i.TitleEn,
		&i.TitleAr,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.Blocks,
		&i.IsVisible,
		&i.InHeader,
		&i.InFooter,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const getPageBySlug = `-- name: GetPageBySlug :one
SELECT id, slug, page_type, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at FROM cms.page WHERE slug = $1 LIMIT 1
`
func (q *Queries) GetPageBySlug(ctx context.Context, slug string) (CmsPage, error) {
	row := q.db.QueryRow(ctx, getPageBySlug, slug)
	var i CmsPage
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.PageType,
		&i.TitleEn,
		&i.TitleAr,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.Blocks,
		&i.IsVisible,
		&i.InHeader,
		&i.InFooter,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const listAllArticles = `-- name: ListAllArticles :many
SELECT id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, body_html_en, body_html_ar, cover_url, category, tags, author_name, status, publish_at, featured, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, created_at, updated_at FROM cms.article
ORDER BY created_at DESC
`
func (q *Queries) ListAllArticles(ctx context.Context) ([]CmsArticle, error) {
	rows, err := q.db.Query(ctx, listAllArticles)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsArticle
	for rows.Next() {
		var i CmsArticle
		if err := rows.Scan(
			&i.ID,
			&i.Slug,
			&i.TitleEn,
			&i.TitleAr,
			&i.ExcerptEn,
			&i.ExcerptAr,
			&i.BodyEn,
			&i.BodyAr,
			&i.BodyHtmlEn,
			&i.BodyHtmlAr,
			&i.CoverUrl,
			&i.Category,
			&i.Tags,
			&i.AuthorName,
			&i.Status,
			&i.PublishAt,
			&i.Featured,
			&i.SeoTitleEn,
			&i.SeoTitleAr,
			&i.SeoDescriptionEn,
			&i.SeoDescriptionAr,
			&i.CreatedAt,
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
const listAllFAQs = `-- name: ListAllFAQs :many
SELECT id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at FROM cms.faq ORDER BY sort_order ASC, created_at ASC
`
func (q *Queries) ListAllFAQs(ctx context.Context) ([]CmsFaq, error) {
	rows, err := q.db.Query(ctx, listAllFAQs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsFaq
	for rows.Next() {
		var i CmsFaq
		if err := rows.Scan(
			&i.ID,
			&i.QuestionEn,
			&i.QuestionAr,
			&i.AnswerEn,
			&i.AnswerAr,
			&i.Category,
			&i.IsPublished,
			&i.SortOrder,
			&i.CreatedAt,
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
const listAllPages = `-- name: ListAllPages :many
SELECT id, slug, page_type, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at FROM cms.page ORDER BY sort_order ASC, created_at DESC
`
func (q *Queries) ListAllPages(ctx context.Context) ([]CmsPage, error) {
	rows, err := q.db.Query(ctx, listAllPages)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsPage
	for rows.Next() {
		var i CmsPage
		if err := rows.Scan(
			&i.ID,
			&i.Slug,
			&i.PageType,
			&i.TitleEn,
			&i.TitleAr,
			&i.SeoTitleEn,
			&i.SeoTitleAr,
			&i.SeoDescriptionEn,
			&i.SeoDescriptionAr,
			&i.Blocks,
			&i.IsVisible,
			&i.InHeader,
			&i.InFooter,
			&i.SortOrder,
			&i.CreatedAt,
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
const listAllReviews = `-- name: ListAllReviews :many
SELECT id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, sort_order, year, created_at FROM cms.review ORDER BY sort_order ASC, created_at DESC
`
func (q *Queries) ListAllReviews(ctx context.Context) ([]CmsReview, error) {
	rows, err := q.db.Query(ctx, listAllReviews)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsReview
	for rows.Next() {
		var i CmsReview
		if err := rows.Scan(
			&i.ID,
			&i.AuthorEn,
			&i.AuthorAr,
			&i.CompanyEn,
			&i.CompanyAr,
			&i.QuoteEn,
			&i.QuoteAr,
			&i.Rating,
			&i.IsApproved,
			&i.SortOrder,
			&i.Year,
			&i.CreatedAt,
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
const listApprovedReviews = `-- name: ListApprovedReviews :many
SELECT id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, sort_order, year, created_at FROM cms.review WHERE is_approved = true ORDER BY sort_order ASC, created_at DESC
`
func (q *Queries) ListApprovedReviews(ctx context.Context) ([]CmsReview, error) {
	rows, err := q.db.Query(ctx, listApprovedReviews)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsReview
	for rows.Next() {
		var i CmsReview
		if err := rows.Scan(
			&i.ID,
			&i.AuthorEn,
			&i.AuthorAr,
			&i.CompanyEn,
			&i.CompanyAr,
			&i.QuoteEn,
			&i.QuoteAr,
			&i.Rating,
			&i.IsApproved,
			&i.SortOrder,
			&i.Year,
			&i.CreatedAt,
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
const listPublishedArticles = `-- name: ListPublishedArticles :many
SELECT id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, body_html_en, body_html_ar, cover_url, category, tags, author_name, status, publish_at, featured, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, created_at, updated_at FROM cms.article
WHERE status = 'published' AND (publish_at IS NULL OR publish_at <= now())
ORDER BY featured DESC, publish_at DESC NULLS LAST, created_at DESC
`
func (q *Queries) ListPublishedArticles(ctx context.Context) ([]CmsArticle, error) {
	rows, err := q.db.Query(ctx, listPublishedArticles)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsArticle
	for rows.Next() {
		var i CmsArticle
		if err := rows.Scan(
			&i.ID,
			&i.Slug,
			&i.TitleEn,
			&i.TitleAr,
			&i.ExcerptEn,
			&i.ExcerptAr,
			&i.BodyEn,
			&i.BodyAr,
			&i.BodyHtmlEn,
			&i.BodyHtmlAr,
			&i.CoverUrl,
			&i.Category,
			&i.Tags,
			&i.AuthorName,
			&i.Status,
			&i.PublishAt,
			&i.Featured,
			&i.SeoTitleEn,
			&i.SeoTitleAr,
			&i.SeoDescriptionEn,
			&i.SeoDescriptionAr,
			&i.CreatedAt,
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
const listPublishedFAQs = `-- name: ListPublishedFAQs :many
SELECT id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at FROM cms.faq WHERE is_published = true ORDER BY sort_order ASC, created_at ASC
`
func (q *Queries) ListPublishedFAQs(ctx context.Context) ([]CmsFaq, error) {
	rows, err := q.db.Query(ctx, listPublishedFAQs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsFaq
	for rows.Next() {
		var i CmsFaq
		if err := rows.Scan(
			&i.ID,
			&i.QuestionEn,
			&i.QuestionAr,
			&i.AnswerEn,
			&i.AnswerAr,
			&i.Category,
			&i.IsPublished,
			&i.SortOrder,
			&i.CreatedAt,
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
const listStatistics = `-- name: ListStatistics :many
SELECT id, metric_value, label_en, label_ar, sub_label_en, sub_label_ar, icon, sort_order FROM cms.statistic ORDER BY sort_order ASC, id ASC
`
func (q *Queries) ListStatistics(ctx context.Context) ([]CmsStatistic, error) {
	rows, err := q.db.Query(ctx, listStatistics)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsStatistic
	for rows.Next() {
		var i CmsStatistic
		if err := rows.Scan(
			&i.ID,
			&i.MetricValue,
			&i.LabelEn,
			&i.LabelAr,
			&i.SubLabelEn,
			&i.SubLabelAr,
			&i.Icon,
			&i.SortOrder,
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
const listVisiblePages = `-- name: ListVisiblePages :many
SELECT id, slug, page_type, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at FROM cms.page WHERE is_visible = true ORDER BY sort_order ASC, title_en ASC
`
func (q *Queries) ListVisiblePages(ctx context.Context) ([]CmsPage, error) {
	rows, err := q.db.Query(ctx, listVisiblePages)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CmsPage
	for rows.Next() {
		var i CmsPage
		if err := rows.Scan(
			&i.ID,
			&i.Slug,
			&i.PageType,
			&i.TitleEn,
			&i.TitleAr,
			&i.SeoTitleEn,
			&i.SeoTitleAr,
			&i.SeoDescriptionEn,
			&i.SeoDescriptionAr,
			&i.Blocks,
			&i.IsVisible,
			&i.InHeader,
			&i.InFooter,
			&i.SortOrder,
			&i.CreatedAt,
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
const publishContentSnapshot = `-- name: PublishContentSnapshot :one
INSERT INTO cms.content_snapshot (id, draft, published, revision, published_at, updated_at)
VALUES ($1, $2, $2, 1, now(), now())
ON CONFLICT (id) DO UPDATE SET
    published = EXCLUDED.draft,
    published_at = now(),
    updated_at = now()
RETURNING id, draft, published, revision, published_at, updated_at
`
type PublishContentSnapshotParams struct {
	ID	string
	Draft	json.RawMessage
}
func (q *Queries) PublishContentSnapshot(ctx context.Context, arg PublishContentSnapshotParams) (CmsContentSnapshot, error) {
	row := q.db.QueryRow(ctx, publishContentSnapshot, arg.ID, arg.Draft)
	var i CmsContentSnapshot
	err := row.Scan(
		&i.ID,
		&i.Draft,
		&i.Published,
		&i.Revision,
		&i.PublishedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const updateArticle = `-- name: UpdateArticle :one
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
RETURNING id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, body_html_en, body_html_ar, cover_url, category, tags, author_name, status, publish_at, featured, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, created_at, updated_at
`
type UpdateArticleParams struct {
	ID			string
	Slug			string
	TitleEn			string
	TitleAr			string
	ExcerptEn		*string
	ExcerptAr		*string
	BodyEn			[]byte
	BodyAr			[]byte
	BodyHtmlEn		*string
	BodyHtmlAr		*string
	CoverUrl		*string
	Category		string
	Tags			[]string
	AuthorName		*string
	Status			string
	PublishAt		*time.Time
	Featured		bool
	SeoTitleEn		*string
	SeoTitleAr		*string
	SeoDescriptionEn	*string
	SeoDescriptionAr	*string
}
func (q *Queries) UpdateArticle(ctx context.Context, arg UpdateArticleParams) (CmsArticle, error) {
	row := q.db.QueryRow(ctx, updateArticle,
		arg.ID,
		arg.Slug,
		arg.TitleEn,
		arg.TitleAr,
		arg.ExcerptEn,
		arg.ExcerptAr,
		arg.BodyEn,
		arg.BodyAr,
		arg.BodyHtmlEn,
		arg.BodyHtmlAr,
		arg.CoverUrl,
		arg.Category,
		arg.Tags,
		arg.AuthorName,
		arg.Status,
		arg.PublishAt,
		arg.Featured,
		arg.SeoTitleEn,
		arg.SeoTitleAr,
		arg.SeoDescriptionEn,
		arg.SeoDescriptionAr,
	)
	var i CmsArticle
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.TitleEn,
		&i.TitleAr,
		&i.ExcerptEn,
		&i.ExcerptAr,
		&i.BodyEn,
		&i.BodyAr,
		&i.BodyHtmlEn,
		&i.BodyHtmlAr,
		&i.CoverUrl,
		&i.Category,
		&i.Tags,
		&i.AuthorName,
		&i.Status,
		&i.PublishAt,
		&i.Featured,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const updateFAQ = `-- name: UpdateFAQ :one
UPDATE cms.faq SET
    question_en = $2,
    question_ar = $3,
    answer_en = $4,
    answer_ar = $5,
    category = $6,
    is_published = $7,
    sort_order = $8
WHERE id = $1
RETURNING id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at
`
type UpdateFAQParams struct {
	ID		string
	QuestionEn	string
	QuestionAr	string
	AnswerEn	string
	AnswerAr	string
	Category	string
	IsPublished	bool
	SortOrder	int32
}
func (q *Queries) UpdateFAQ(ctx context.Context, arg UpdateFAQParams) (CmsFaq, error) {
	row := q.db.QueryRow(ctx, updateFAQ,
		arg.ID,
		arg.QuestionEn,
		arg.QuestionAr,
		arg.AnswerEn,
		arg.AnswerAr,
		arg.Category,
		arg.IsPublished,
		arg.SortOrder,
	)
	var i CmsFaq
	err := row.Scan(
		&i.ID,
		&i.QuestionEn,
		&i.QuestionAr,
		&i.AnswerEn,
		&i.AnswerAr,
		&i.Category,
		&i.IsPublished,
		&i.SortOrder,
		&i.CreatedAt,
	)
	return i, err
}
const updatePage = `-- name: UpdatePage :one
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
RETURNING id, slug, page_type, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at
`
type UpdatePageParams struct {
	ID			string
	Slug			string
	PageType		string
	TitleEn			string
	TitleAr			string
	SeoTitleEn		*string
	SeoTitleAr		*string
	SeoDescriptionEn	*string
	SeoDescriptionAr	*string
	Blocks			json.RawMessage
	IsVisible		bool
	InHeader		bool
	InFooter		bool
	SortOrder		int32
}
func (q *Queries) UpdatePage(ctx context.Context, arg UpdatePageParams) (CmsPage, error) {
	row := q.db.QueryRow(ctx, updatePage,
		arg.ID,
		arg.Slug,
		arg.PageType,
		arg.TitleEn,
		arg.TitleAr,
		arg.SeoTitleEn,
		arg.SeoTitleAr,
		arg.SeoDescriptionEn,
		arg.SeoDescriptionAr,
		arg.Blocks,
		arg.IsVisible,
		arg.InHeader,
		arg.InFooter,
		arg.SortOrder,
	)
	var i CmsPage
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.PageType,
		&i.TitleEn,
		&i.TitleAr,
		&i.SeoTitleEn,
		&i.SeoTitleAr,
		&i.SeoDescriptionEn,
		&i.SeoDescriptionAr,
		&i.Blocks,
		&i.IsVisible,
		&i.InHeader,
		&i.InFooter,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const updateReview = `-- name: UpdateReview :one
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
RETURNING id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, sort_order, year, created_at
`
type UpdateReviewParams struct {
	ID		string
	AuthorEn	string
	AuthorAr	string
	CompanyEn	*string
	CompanyAr	*string
	QuoteEn		string
	QuoteAr		string
	Rating		int32
	IsApproved	bool
	SortOrder	int32
	Year		string
}
func (q *Queries) UpdateReview(ctx context.Context, arg UpdateReviewParams) (CmsReview, error) {
	row := q.db.QueryRow(ctx, updateReview,
		arg.ID,
		arg.AuthorEn,
		arg.AuthorAr,
		arg.CompanyEn,
		arg.CompanyAr,
		arg.QuoteEn,
		arg.QuoteAr,
		arg.Rating,
		arg.IsApproved,
		arg.SortOrder,
		arg.Year,
	)
	var i CmsReview
	err := row.Scan(
		&i.ID,
		&i.AuthorEn,
		&i.AuthorAr,
		&i.CompanyEn,
		&i.CompanyAr,
		&i.QuoteEn,
		&i.QuoteAr,
		&i.Rating,
		&i.IsApproved,
		&i.SortOrder,
		&i.Year,
		&i.CreatedAt,
	)
	return i, err
}
const upsertContentDraft = `-- name: UpsertContentDraft :one
INSERT INTO cms.content_snapshot (id, draft, revision, updated_at)
VALUES ($1, $2, $3, now())
ON CONFLICT (id) DO UPDATE SET
    draft = EXCLUDED.draft,
    revision = cms.content_snapshot.revision + 1,
    updated_at = now()
RETURNING id, draft, published, revision, published_at, updated_at
`
type UpsertContentDraftParams struct {
	ID		string
	Draft		json.RawMessage
	Revision	int32
}
func (q *Queries) UpsertContentDraft(ctx context.Context, arg UpsertContentDraftParams) (CmsContentSnapshot, error) {
	row := q.db.QueryRow(ctx, upsertContentDraft, arg.ID, arg.Draft, arg.Revision)
	var i CmsContentSnapshot
	err := row.Scan(
		&i.ID,
		&i.Draft,
		&i.Published,
		&i.Revision,
		&i.PublishedAt,
		&i.UpdatedAt,
	)
	return i, err
}
const upsertStatistic = `-- name: UpsertStatistic :one
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
RETURNING id, metric_value, label_en, label_ar, sub_label_en, sub_label_ar, icon, sort_order
`
type UpsertStatisticParams struct {
	ID		string
	MetricValue	string
	LabelEn		string
	LabelAr		string
	SubLabelEn	*string
	SubLabelAr	*string
	Icon		*string
	SortOrder	int32
}
func (q *Queries) UpsertStatistic(ctx context.Context, arg UpsertStatisticParams) (CmsStatistic, error) {
	row := q.db.QueryRow(ctx, upsertStatistic,
		arg.ID,
		arg.MetricValue,
		arg.LabelEn,
		arg.LabelAr,
		arg.SubLabelEn,
		arg.SubLabelAr,
		arg.Icon,
		arg.SortOrder,
	)
	var i CmsStatistic
	err := row.Scan(
		&i.ID,
		&i.MetricValue,
		&i.LabelEn,
		&i.LabelAr,
		&i.SubLabelEn,
		&i.SubLabelAr,
		&i.Icon,
		&i.SortOrder,
	)
	return i, err
}
