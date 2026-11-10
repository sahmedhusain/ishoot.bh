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
