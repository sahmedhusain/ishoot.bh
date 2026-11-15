package postgres
import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/cms/internal/postgres/sqlcdb"
)
const Schema = "cms"
type Page = sqlcdb.CmsPage
type Article = sqlcdb.CmsArticle
type Review = sqlcdb.CmsReview
type FAQ = sqlcdb.CmsFaq
type Statistic = sqlcdb.CmsStatistic
type ContentSnapshot = sqlcdb.CmsContentSnapshot
type Store struct {
	pool	*pgxpool.Pool
	q	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Store	{ return &Store{pool: pool, q: sqlcdb.New(pool)} }
func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}
func (s *Store) GetPageBySlug(ctx context.Context, slug string) (Page, error) {
	return s.q.GetPageBySlug(ctx, slug)
}
func (s *Store) GetPageByID(ctx context.Context, id string) (Page, error) {
	return s.q.GetPageByID(ctx, id)
}
func (s *Store) ListVisiblePages(ctx context.Context) ([]Page, error) {
	return s.q.ListVisiblePages(ctx)
}
func (s *Store) ListAllPages(ctx context.Context) ([]Page, error) {
	return s.q.ListAllPages(ctx)
}
func (s *Store) CreatePage(ctx context.Context, p sqlcdb.CreatePageParams) (Page, error) {
	return s.q.CreatePage(ctx, p)
}
func (s *Store) UpdatePage(ctx context.Context, p sqlcdb.UpdatePageParams) (Page, error) {
	return s.q.UpdatePage(ctx, p)
}
func (s *Store) DeletePage(ctx context.Context, id string) error {
	return s.q.DeletePage(ctx, id)
}
func (s *Store) GetArticleBySlug(ctx context.Context, slug string) (Article, error) {
	return s.q.GetArticleBySlug(ctx, slug)
}
func (s *Store) GetArticleByID(ctx context.Context, id string) (Article, error) {
	return s.q.GetArticleByID(ctx, id)
}
func (s *Store) ListPublishedArticles(ctx context.Context) ([]Article, error) {
	return s.q.ListPublishedArticles(ctx)
}
func (s *Store) ListAllArticles(ctx context.Context) ([]Article, error) {
	return s.q.ListAllArticles(ctx)
}
func (s *Store) CreateArticle(ctx context.Context, p sqlcdb.CreateArticleParams) (Article, error) {
	return s.q.CreateArticle(ctx, p)
}
func (s *Store) UpdateArticle(ctx context.Context, p sqlcdb.UpdateArticleParams) (Article, error) {
	return s.q.UpdateArticle(ctx, p)
}
func (s *Store) DeleteArticle(ctx context.Context, id string) error {
	return s.q.DeleteArticle(ctx, id)
}
func (s *Store) ListApprovedReviews(ctx context.Context) ([]Review, error) {
	return s.q.ListApprovedReviews(ctx)
}
func (s *Store) ListAllReviews(ctx context.Context) ([]Review, error) {
	return s.q.ListAllReviews(ctx)
}
func (s *Store) CreateReview(ctx context.Context, p sqlcdb.CreateReviewParams) (Review, error) {
	return s.q.CreateReview(ctx, p)
}
func (s *Store) UpdateReview(ctx context.Context, p sqlcdb.UpdateReviewParams) (Review, error) {
	return s.q.UpdateReview(ctx, p)
}
func (s *Store) DeleteReview(ctx context.Context, id string) error {
	return s.q.DeleteReview(ctx, id)
}
func (s *Store) ListPublishedFAQs(ctx context.Context) ([]FAQ, error) {
	return s.q.ListPublishedFAQs(ctx)
}
func (s *Store) ListAllFAQs(ctx context.Context) ([]FAQ, error) {
	return s.q.ListAllFAQs(ctx)
}
func (s *Store) CreateFAQ(ctx context.Context, p sqlcdb.CreateFAQParams) (FAQ, error) {
	return s.q.CreateFAQ(ctx, p)
}
func (s *Store) UpdateFAQ(ctx context.Context, p sqlcdb.UpdateFAQParams) (FAQ, error) {
	return s.q.UpdateFAQ(ctx, p)
}
func (s *Store) DeleteFAQ(ctx context.Context, id string) error {
	return s.q.DeleteFAQ(ctx, id)
}
func (s *Store) ListStatistics(ctx context.Context) ([]Statistic, error) {
	return s.q.ListStatistics(ctx)
}
func (s *Store) UpsertStatistic(ctx context.Context, p sqlcdb.UpsertStatisticParams) (Statistic, error) {
	return s.q.UpsertStatistic(ctx, p)
}
func (s *Store) DeleteStatistic(ctx context.Context, id string) error {
	return s.q.DeleteStatistic(ctx, id)
}
func (s *Store) GetContentSnapshot(ctx context.Context, id string) (ContentSnapshot, error) {
	return s.q.GetContentSnapshot(ctx, id)
}
func (s *Store) UpsertContentDraft(ctx context.Context, p sqlcdb.UpsertContentDraftParams) (ContentSnapshot, error) {
	return s.q.UpsertContentDraft(ctx, p)
}
func (s *Store) PublishContentSnapshot(ctx context.Context, p sqlcdb.PublishContentSnapshotParams) (ContentSnapshot, error) {
	return s.q.PublishContentSnapshot(ctx, p)
}

type PortfolioCategory struct {
	ID           string  `json:"id"`
	Slug         *string `json:"slug"`
	NameEn       *string `json:"nameEn"`
	NameAr       *string `json:"nameAr"`
	DisplayOrder *int32  `json:"displayOrder"`
}

type PortfolioItem struct {
	ID          string   `json:"id"`
	CategoryID  *string  `json:"categoryId"`
	Slug        *string  `json:"slug"`
	TitleEn     *string  `json:"titleEn"`
	TitleAr     *string  `json:"titleAr"`
	ClientName  *string  `json:"clientName"`
	Year        *int32   `json:"year"`
	SubtitleEn  *string  `json:"subtitleEn"`
	SubtitleAr  *string  `json:"subtitleAr"`
	Price       *float64 `json:"price"`
	PriceNoteEn *string  `json:"priceNoteEn"`
	PriceNoteAr *string  `json:"priceNoteAr"`
	Location    *string  `json:"location"`
	ExternalURL *string  `json:"externalUrl"`
}

func (s *Store) ListPortfolioCategories(ctx context.Context) ([]PortfolioCategory, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, slug, name_en, name_ar, display_order
		FROM cms.portfolio_category
		ORDER BY COALESCE(display_order, 0) ASC, id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PortfolioCategory{}
	for rows.Next() {
		var c PortfolioCategory
		if err := rows.Scan(&c.ID, &c.Slug, &c.NameEn, &c.NameAr, &c.DisplayOrder); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) CreatePortfolioCategory(ctx context.Context, c PortfolioCategory) (PortfolioCategory, error) {
	var out PortfolioCategory
	err := s.pool.QueryRow(ctx, `
		INSERT INTO cms.portfolio_category (id, slug, name_en, name_ar, display_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, slug, name_en, name_ar, display_order
	`, c.ID, c.Slug, c.NameEn, c.NameAr, c.DisplayOrder).Scan(
		&out.ID, &out.Slug, &out.NameEn, &out.NameAr, &out.DisplayOrder,
	)
	return out, err
}

func (s *Store) UpdatePortfolioCategory(ctx context.Context, c PortfolioCategory) (PortfolioCategory, error) {
	var out PortfolioCategory
	err := s.pool.QueryRow(ctx, `
		UPDATE cms.portfolio_category
		SET slug = COALESCE($2, slug),
		    name_en = COALESCE($3, name_en),
		    name_ar = COALESCE($4, name_ar),
		    display_order = COALESCE($5, display_order)
		WHERE id = $1
		RETURNING id, slug, name_en, name_ar, display_order
	`, c.ID, c.Slug, c.NameEn, c.NameAr, c.DisplayOrder).Scan(
		&out.ID, &out.Slug, &out.NameEn, &out.NameAr, &out.DisplayOrder,
	)
	return out, err
}

func (s *Store) DeletePortfolioCategory(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM cms.portfolio_category WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

const portfolioItemSelect = `
	SELECT id, category_id, slug, title_en, title_ar, client_name, year,
	       subtitle_en, subtitle_ar, price::float8, price_note_en, price_note_ar,
	       location, external_url
	FROM cms.portfolio_item
`

func scanPortfolioItem(row pgx.Row) (PortfolioItem, error) {
	var it PortfolioItem
	err := row.Scan(
		&it.ID, &it.CategoryID, &it.Slug, &it.TitleEn, &it.TitleAr, &it.ClientName, &it.Year,
		&it.SubtitleEn, &it.SubtitleAr, &it.Price, &it.PriceNoteEn, &it.PriceNoteAr,
		&it.Location, &it.ExternalURL,
	)
	return it, err
}

func (s *Store) ListPortfolioItems(ctx context.Context, categorySlug string) ([]PortfolioItem, error) {
	var rows pgx.Rows
	var err error
	if categorySlug != "" && categorySlug != "all" {
		rows, err = s.pool.Query(ctx, `
			SELECT pi.id, pi.category_id, pi.slug, pi.title_en, pi.title_ar, pi.client_name, pi.year,
			       pi.subtitle_en, pi.subtitle_ar, pi.price::float8, pi.price_note_en, pi.price_note_ar,
			       pi.location, pi.external_url
			FROM cms.portfolio_item pi
			JOIN cms.portfolio_category pc ON pc.id = pi.category_id
			WHERE pc.slug = $1
			ORDER BY COALESCE(pi.year, 0) DESC, pi.id ASC
		`, categorySlug)
	} else {
		rows, err = s.pool.Query(ctx, portfolioItemSelect+`ORDER BY COALESCE(year, 0) DESC, id ASC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PortfolioItem{}
	for rows.Next() {
		it, err := scanPortfolioItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (s *Store) GetPortfolioItemBySlug(ctx context.Context, slug string) (PortfolioItem, error) {
	return scanPortfolioItem(s.pool.QueryRow(ctx, portfolioItemSelect+`WHERE slug = $1 LIMIT 1`, slug))
}

func (s *Store) CreatePortfolioItem(ctx context.Context, it PortfolioItem) (PortfolioItem, error) {
	return scanPortfolioItem(s.pool.QueryRow(ctx, `
		INSERT INTO cms.portfolio_item (
			id, category_id, slug, title_en, title_ar, client_name, year,
			subtitle_en, subtitle_ar, price, price_note_en, price_note_ar,
			location, external_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, category_id, slug, title_en, title_ar, client_name, year,
		          subtitle_en, subtitle_ar, price::float8, price_note_en, price_note_ar,
		          location, external_url
	`, it.ID, it.CategoryID, it.Slug, it.TitleEn, it.TitleAr, it.ClientName, it.Year,
		it.SubtitleEn, it.SubtitleAr, it.Price, it.PriceNoteEn, it.PriceNoteAr,
		it.Location, it.ExternalURL))
}

func (s *Store) UpdatePortfolioItem(ctx context.Context, it PortfolioItem) (PortfolioItem, error) {
	return scanPortfolioItem(s.pool.QueryRow(ctx, `
		UPDATE cms.portfolio_item
		SET category_id = COALESCE($2, category_id),
		    slug = COALESCE($3, slug),
		    title_en = COALESCE($4, title_en),
		    title_ar = COALESCE($5, title_ar),
		    client_name = COALESCE($6, client_name),
		    year = COALESCE($7, year),
		    subtitle_en = COALESCE($8, subtitle_en),
		    subtitle_ar = COALESCE($9, subtitle_ar),
		    price = COALESCE($10, price),
		    price_note_en = COALESCE($11, price_note_en),
		    price_note_ar = COALESCE($12, price_note_ar),
		    location = COALESCE($13, location),
		    external_url = COALESCE($14, external_url)
		WHERE id = $1
		RETURNING id, category_id, slug, title_en, title_ar, client_name, year,
		          subtitle_en, subtitle_ar, price::float8, price_note_en, price_note_ar,
		          location, external_url
	`, it.ID, it.CategoryID, it.Slug, it.TitleEn, it.TitleAr, it.ClientName, it.Year,
		it.SubtitleEn, it.SubtitleAr, it.Price, it.PriceNoteEn, it.PriceNoteAr,
		it.Location, it.ExternalURL))
}

func (s *Store) DeletePortfolioItem(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM cms.portfolio_item WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
