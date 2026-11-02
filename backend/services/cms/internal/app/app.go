// Package app holds the cms service's use cases.
package app

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/cms/internal/postgres"
	"platform.local/backend/services/cms/internal/postgres/sqlcdb"
)

var (
	ErrNotFound = errors.New("cms resource not found")
	ErrConflict = errors.New("cms resource already exists")
)

const (
	EventPageChanged       = "cms.page.changed"
	EventArticleChanged    = "cms.article.changed"
	EventContentPublished  = "cms.content.published"
)

type Service struct {
	store *postgres.Store
	now   func() time.Time
}

func New(store *postgres.Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
	}
}

func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}

// Pages
func (s *Service) GetPageBySlug(ctx context.Context, slug string) (postgres.Page, error) {
	p, err := s.store.GetPageBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Page{}, ErrNotFound
		}
		return postgres.Page{}, err
	}
	return p, nil
}

func (s *Service) GetPageByID(ctx context.Context, id string) (postgres.Page, error) {
	p, err := s.store.GetPageByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Page{}, ErrNotFound
		}
		return postgres.Page{}, err
	}
	return p, nil
}

func (s *Service) ListPages(ctx context.Context, all bool) ([]postgres.Page, error) {
	if all {
		return s.store.ListAllPages(ctx)
	}
	return s.store.ListVisiblePages(ctx)
}

func (s *Service) CreatePage(ctx context.Context, in sqlcdb.CreatePageParams) (postgres.Page, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.Page
	err := s.change(ctx, EventPageChanged, map[string]string{"pageId": in.ID, "slug": in.Slug, "action": "created"}, func(st *postgres.Store) error {
		var err error
		created, err = st.CreatePage(ctx, in)
		return err
	})
	return created, err
}

func (s *Service) UpdatePage(ctx context.Context, in sqlcdb.UpdatePageParams) (postgres.Page, error) {
	var updated postgres.Page
	err := s.change(ctx, EventPageChanged, map[string]string{"pageId": in.ID, "slug": in.Slug, "action": "updated"}, func(st *postgres.Store) error {
		var err error
		updated, err = st.UpdatePage(ctx, in)
		return err
	})
	return updated, err
}

func (s *Service) DeletePage(ctx context.Context, id string) error {
	return s.change(ctx, EventPageChanged, map[string]string{"pageId": id, "action": "deleted"}, func(st *postgres.Store) error {
		return st.DeletePage(ctx, id)
	})
}

// Articles
func (s *Service) GetArticleBySlug(ctx context.Context, slug string) (postgres.Article, error) {
	a, err := s.store.GetArticleBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Article{}, ErrNotFound
		}
		return postgres.Article{}, err
	}
	return a, nil
}

func (s *Service) GetArticleByID(ctx context.Context, id string) (postgres.Article, error) {
	a, err := s.store.GetArticleByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Article{}, ErrNotFound
		}
		return postgres.Article{}, err
	}
	return a, nil
}

func (s *Service) ListArticles(ctx context.Context, all bool) ([]postgres.Article, error) {
	if all {
		return s.store.ListAllArticles(ctx)
	}
	return s.store.ListPublishedArticles(ctx)
}

func (s *Service) CreateArticle(ctx context.Context, in sqlcdb.CreateArticleParams) (postgres.Article, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.Article
	err := s.change(ctx, EventArticleChanged, map[string]string{"articleId": in.ID, "slug": in.Slug, "action": "created"}, func(st *postgres.Store) error {
		var err error
		created, err = st.CreateArticle(ctx, in)
		return err
	})
	return created, err
}

func (s *Service) UpdateArticle(ctx context.Context, in sqlcdb.UpdateArticleParams) (postgres.Article, error) {
	var updated postgres.Article
	err := s.change(ctx, EventArticleChanged, map[string]string{"articleId": in.ID, "slug": in.Slug, "action": "updated"}, func(st *postgres.Store) error {
		var err error
		updated, err = st.UpdateArticle(ctx, in)
		return err
	})
	return updated, err
}

func (s *Service) DeleteArticle(ctx context.Context, id string) error {
	return s.change(ctx, EventArticleChanged, map[string]string{"articleId": id, "action": "deleted"}, func(st *postgres.Store) error {
		return st.DeleteArticle(ctx, id)
	})
}

// Reviews
func (s *Service) ListReviews(ctx context.Context, all bool) ([]postgres.Review, error) {
	if all {
		return s.store.ListAllReviews(ctx)
	}
	return s.store.ListApprovedReviews(ctx)
}

func (s *Service) CreateReview(ctx context.Context, in sqlcdb.CreateReviewParams) (postgres.Review, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateReview(ctx, in)
}

func (s *Service) UpdateReview(ctx context.Context, in sqlcdb.UpdateReviewParams) (postgres.Review, error) {
	return s.store.UpdateReview(ctx, in)
}

func (s *Service) DeleteReview(ctx context.Context, id string) error {
	return s.store.DeleteReview(ctx, id)
}

// FAQs
func (s *Service) ListFAQs(ctx context.Context, all bool) ([]postgres.FAQ, error) {
	if all {
		return s.store.ListAllFAQs(ctx)
	}
	return s.store.ListPublishedFAQs(ctx)
}

func (s *Service) CreateFAQ(ctx context.Context, in sqlcdb.CreateFAQParams) (postgres.FAQ, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateFAQ(ctx, in)
}

func (s *Service) UpdateFAQ(ctx context.Context, in sqlcdb.UpdateFAQParams) (postgres.FAQ, error) {
	return s.store.UpdateFAQ(ctx, in)
}

func (s *Service) DeleteFAQ(ctx context.Context, id string) error {
	return s.store.DeleteFAQ(ctx, id)
}

// Statistics
func (s *Service) ListStatistics(ctx context.Context) ([]postgres.Statistic, error) {
	return s.store.ListStatistics(ctx)
}

func (s *Service) UpsertStatistic(ctx context.Context, in sqlcdb.UpsertStatisticParams) (postgres.Statistic, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.UpsertStatistic(ctx, in)
}

func (s *Service) DeleteStatistic(ctx context.Context, id string) error {
	return s.store.DeleteStatistic(ctx, id)
}

// ContentSnapshot
func (s *Service) GetContentSnapshot(ctx context.Context, id string) (postgres.ContentSnapshot, error) {
	if id == "" {
		id = "main"
	}
	snap, err := s.store.GetContentSnapshot(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.ContentSnapshot{ID: id, Draft: json.RawMessage(`{}`), Published: json.RawMessage(`{}`), Revision: 0}, nil
		}
		return postgres.ContentSnapshot{}, err
	}
	return snap, nil
}

func (s *Service) SaveDraft(ctx context.Context, id string, draft json.RawMessage) (postgres.ContentSnapshot, error) {
	if id == "" {
		id = "main"
	}
	return s.store.UpsertContentDraft(ctx, sqlcdb.UpsertContentDraftParams{
		ID:       id,
		Draft:    draft,
		Revision: 1,
	})
}

func (s *Service) PublishContent(ctx context.Context, id string) (postgres.ContentSnapshot, error) {
	if id == "" {
		id = "main"
	}
	var published postgres.ContentSnapshot
	err := s.change(ctx, EventContentPublished, map[string]string{"snapshotId": id, "action": "published"}, func(st *postgres.Store) error {
		snap, err := st.GetContentSnapshot(ctx, id)
		if err != nil {
			return err
		}
		published, err = st.PublishContentSnapshot(ctx, sqlcdb.PublishContentSnapshotParams{
			ID:    id,
			Draft: snap.Draft,
		})
		return err
	})
	return published, err
}
