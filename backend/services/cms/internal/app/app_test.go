package app_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/cms/internal/app"
	"platform.local/backend/services/cms/internal/postgres"
	"platform.local/backend/services/cms/internal/postgres/sqlcdb"
	"platform.local/backend/services/cms/migrations"
)

func setup(t *testing.T) (*app.Service, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	return app.New(postgres.New(pool)), pool
}

func TestPages(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	// Create Page
	created, err := svc.CreatePage(ctx, sqlcdb.CreatePageParams{
		Slug:      "home",
		PageType:  "standard",
		TitleEn:   "Home Page",
		TitleAr:   "الصفحة الرئيسية",
		Blocks:    json.RawMessage(`[]`),
		IsVisible: true,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, created.ID)
	assert.Equal(t, "home", created.Slug)
	assert.Equal(t, "Home Page", created.TitleEn)

	// GetPageByID
	page, err := svc.GetPageByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, page.ID)

	// GetPageBySlug
	pageBySlug, err := svc.GetPageBySlug(ctx, "home")
	require.NoError(t, err)
	assert.Equal(t, created.ID, pageBySlug.ID)

	// Get non-existent
	_, err = svc.GetPageByID(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	_, err = svc.GetPageBySlug(ctx, "non-existent-slug")
	assert.ErrorIs(t, err, app.ErrNotFound)

	// ListPages (all vs visible)
	pages, err := svc.ListPages(ctx, false)
	require.NoError(t, err)
	assert.Len(t, pages, 1)

	allPages, err := svc.ListPages(ctx, true)
	require.NoError(t, err)
	assert.Len(t, allPages, 1)

	// UpdatePage
	updated, err := svc.UpdatePage(ctx, sqlcdb.UpdatePageParams{
		ID:        created.ID,
		Slug:      "home-updated",
		PageType:  "standard",
		TitleEn:   "Home Page Updated",
		TitleAr:   "الصفحة الرئيسية المحدثة",
		Blocks:    json.RawMessage(`[]`),
		IsVisible: false,
	})
	require.NoError(t, err)
	assert.Equal(t, "home-updated", updated.Slug)

	// DeletePage
	err = svc.DeletePage(ctx, created.ID)
	require.NoError(t, err)

	_, err = svc.GetPageByID(ctx, created.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
}

func TestArticles(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	created, err := svc.CreateArticle(ctx, sqlcdb.CreateArticleParams{
		Slug:     "first-post",
		TitleEn:  "First Post",
		TitleAr:  "المقال الأول",
		BodyEn:   []byte(`{"text":"hello"}`),
		BodyAr:   []byte(`{"text":"مرحبا"}`),
		Category: "news",
		Tags:     []string{"news"},
		Status:   "published",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, created.ID)

	article, err := svc.GetArticleByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, "first-post", article.Slug)

	articleBySlug, err := svc.GetArticleBySlug(ctx, "first-post")
	require.NoError(t, err)
	assert.Equal(t, created.ID, articleBySlug.ID)

	_, err = svc.GetArticleByID(ctx, "missing")
	assert.ErrorIs(t, err, app.ErrNotFound)

	_, err = svc.GetArticleBySlug(ctx, "missing")
	assert.ErrorIs(t, err, app.ErrNotFound)

	list, err := svc.ListArticles(ctx, false)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	listAll, err := svc.ListArticles(ctx, true)
	require.NoError(t, err)
	assert.Len(t, listAll, 1)

	updated, err := svc.UpdateArticle(ctx, sqlcdb.UpdateArticleParams{
		ID:       created.ID,
		Slug:     "first-post-updated",
		TitleEn:  "First Post Updated",
		TitleAr:  "المقال الأول المحدث",
		BodyEn:   []byte(`{"text":"hello updated"}`),
		BodyAr:   []byte(`{"text":"مرحبا محدث"}`),
		Category: "news",
		Tags:     []string{"news", "updates"},
		Status:   "published",
	})
	require.NoError(t, err)
	assert.Equal(t, "first-post-updated", updated.Slug)

	err = svc.DeleteArticle(ctx, created.ID)
	require.NoError(t, err)

	_, err = svc.GetArticleByID(ctx, created.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
}

func TestReviews(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	review, err := svc.CreateReview(ctx, sqlcdb.CreateReviewParams{
		AuthorEn:   "Alice",
		AuthorAr:   "أليس",
		QuoteEn:    "Great product!",
		QuoteAr:    "منتج رائع!",
		Rating:     5,
		IsApproved: true,
		Year:       "2026",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, review.ID)

	list, err := svc.ListReviews(ctx, false)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	listAll, err := svc.ListReviews(ctx, true)
	require.NoError(t, err)
	assert.Len(t, listAll, 1)

	updated, err := svc.UpdateReview(ctx, sqlcdb.UpdateReviewParams{
		ID:         review.ID,
		AuthorEn:   "Alice M.",
		AuthorAr:   "أليس م.",
		QuoteEn:    "Good product!",
		QuoteAr:    "منتج جيد!",
		Rating:     4,
		IsApproved: false,
		Year:       "2026",
	})
	require.NoError(t, err)
	assert.Equal(t, int32(4), updated.Rating)

	err = svc.DeleteReview(ctx, review.ID)
	require.NoError(t, err)
}

func TestFAQs(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	faq, err := svc.CreateFAQ(ctx, sqlcdb.CreateFAQParams{
		QuestionEn:  "What is this?",
		QuestionAr:  "ما هذا؟",
		AnswerEn:    "This is a platform.",
		AnswerAr:    "هذه منصة.",
		Category:    "general",
		IsPublished: true,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, faq.ID)

	list, err := svc.ListFAQs(ctx, false)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	listAll, err := svc.ListFAQs(ctx, true)
	require.NoError(t, err)
	assert.Len(t, listAll, 1)

	updated, err := svc.UpdateFAQ(ctx, sqlcdb.UpdateFAQParams{
		ID:          faq.ID,
		QuestionEn:  "What is this updated?",
		QuestionAr:  "ما هذا المحدث؟",
		AnswerEn:    "Updated answer.",
		AnswerAr:    "إجابة محدثة.",
		Category:    "general",
		IsPublished: false,
	})
	require.NoError(t, err)
	assert.Equal(t, "What is this updated?", updated.QuestionEn)

	err = svc.DeleteFAQ(ctx, faq.ID)
	require.NoError(t, err)
}

func TestStatistics(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	stat, err := svc.UpsertStatistic(ctx, sqlcdb.UpsertStatisticParams{
		MetricValue: "1000",
		LabelEn:     "Total Users",
		LabelAr:     "إجمالي المستخدمين",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, stat.ID)

	list, err := svc.ListStatistics(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)
	assert.Equal(t, "1000", list[0].MetricValue)

	err = svc.DeleteStatistic(ctx, stat.ID)
	require.NoError(t, err)

	listAfter, err := svc.ListStatistics(ctx)
	require.NoError(t, err)
	assert.Empty(t, listAfter)
}

func TestContentSnapshotAndDrafts(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	// Snapshot for non-existent default main ID
	snap, err := svc.GetContentSnapshot(ctx, "")
	require.NoError(t, err)
	assert.Equal(t, "main", snap.ID)
	assert.JSONEq(t, "{}", string(snap.Draft))
	assert.JSONEq(t, "{}", string(snap.Published))

	// Save Draft
	draftContent := json.RawMessage(`{"hero":{"title":"New Title"}}`)
	saved, err := svc.SaveDraft(ctx, "main", draftContent)
	require.NoError(t, err)
	assert.Equal(t, "main", saved.ID)
	assert.JSONEq(t, string(draftContent), string(saved.Draft))

	// GetContentSnapshot after save
	snap2, err := svc.GetContentSnapshot(ctx, "main")
	require.NoError(t, err)
	assert.JSONEq(t, string(draftContent), string(snap2.Draft))

	// Publish Content
	pub, err := svc.PublishContent(ctx, "main")
	require.NoError(t, err)
	assert.Equal(t, "main", pub.ID)
	assert.JSONEq(t, string(draftContent), string(pub.Published))
}
