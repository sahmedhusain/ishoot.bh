// Package httpapi exposes the cms use cases over HTTP.
package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/cms/api"
	"platform.local/backend/services/cms/internal/app"
	"platform.local/backend/services/cms/internal/postgres"
	"platform.local/backend/services/cms/internal/postgres/sqlcdb"
)

type Options struct {
	Verifier *authn.Verifier
	Readers  []string
	Writers  []string
}

type handler struct {
	svc  *app.Service
	opts Options
}

func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}

	e.GET("/v1/cms/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})

	// Public / General Read Endpoints (no auth required or open to web/service)
	public := e.Group("/v1/cms")
	public.GET("/pages/:slug", h.getPageBySlug)
	public.GET("/pages", h.listPages)
	public.GET("/articles/:slug", h.getArticleBySlug)
	public.GET("/articles", h.listArticles)
	public.GET("/reviews", h.listReviews)
	public.GET("/faqs", h.listFAQs)
	public.GET("/statistics", h.listStatistics)
	public.GET("/snapshots/:id", h.getContentSnapshot)

	// Protected Endpoints (Staff or Service token)
	authMiddleware := authn.Require(opts.Verifier, authn.RealmStaff, authn.RealmService, authn.RealmIT)
	desk := e.Group("/v1/cms", authMiddleware)

	// Pages
	desk.POST("/pages", h.createPage)
	desk.GET("/pages/id/:id", h.getPageByID)
	desk.PUT("/pages/:id", h.updatePage)
	desk.DELETE("/pages/:id", h.deletePage)

	// Articles
	desk.POST("/articles", h.createArticle)
	desk.GET("/articles/id/:id", h.getArticleByID)
	desk.PUT("/articles/:id", h.updateArticle)
	desk.DELETE("/articles/:id", h.deleteArticle)

	// Reviews
	desk.POST("/reviews", h.createReview)
	desk.PUT("/reviews/:id", h.updateReview)
	desk.DELETE("/reviews/:id", h.deleteReview)

	// FAQs
	desk.POST("/faqs", h.createFAQ)
	desk.PUT("/faqs/:id", h.updateFAQ)
	desk.DELETE("/faqs/:id", h.deleteFAQ)

	// Statistics
	desk.POST("/statistics", h.upsertStatistic)
	desk.DELETE("/statistics/:id", h.deleteStatistic)

	// Snapshots
	desk.PUT("/snapshots/:id/draft", h.saveDraft)
	desk.POST("/snapshots/:id/publish", h.publishSnapshot)
}

func caller(allowed []string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok || !slices.Contains(allowed, p.Subject) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	}
}

// Pages Handlers
func (h *handler) getPageBySlug(c echo.Context) error {
	p, err := h.svc.GetPageBySlug(c.Request().Context(), c.Param("slug"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, formatPage(p))
}

func (h *handler) getPageByID(c echo.Context) error {
	p, err := h.svc.GetPageByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, formatPage(p))
}

func (h *handler) listPages(c echo.Context) error {
	all, _ := strconv.ParseBool(c.QueryParam("all"))
	pages, err := h.svc.ListPages(c.Request().Context(), all)
	if err != nil {
		return err
	}
	out := make([]pageJSON, len(pages))
	for i, p := range pages {
		out[i] = formatPage(p)
	}
	return c.JSON(http.StatusOK, out)
}

type pageBody struct {
	Slug             string          `json:"slug"`
	PageType         string          `json:"pageType"`
	TitleEn          string          `json:"titleEn"`
	TitleAr          string          `json:"titleAr"`
	SeoTitleEn       *string         `json:"seoTitleEn"`
	SeoTitleAr       *string         `json:"seoTitleAr"`
	SeoDescriptionEn *string         `json:"seoDescriptionEn"`
	SeoDescriptionAr *string         `json:"seoDescriptionAr"`
	Blocks           json.RawMessage `json:"blocks"`
	IsVisible        *bool           `json:"isVisible"`
	InHeader         *bool           `json:"inHeader"`
	InFooter         *bool           `json:"inFooter"`
	SortOrder        *int32          `json:"sortOrder"`
}

func (h *handler) createPage(c echo.Context) error {
	var body pageBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	blocks := body.Blocks
	if len(blocks) == 0 {
		blocks = json.RawMessage(`[]`)
	}
	isVisible := true
	if body.IsVisible != nil {
		isVisible = *body.IsVisible
	}
	inHeader := false
	if body.InHeader != nil {
		inHeader = *body.InHeader
	}
	inFooter := false
	if body.InFooter != nil {
		inFooter = *body.InFooter
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}
	pageType := "custom"
	if body.PageType != "" {
		pageType = body.PageType
	}

	created, err := h.svc.CreatePage(c.Request().Context(), sqlcdb.CreatePageParams{
		Slug:             body.Slug,
		PageType:         pageType,
		TitleEn:          body.TitleEn,
		TitleAr:          body.TitleAr,
		SeoTitleEn:       body.SeoTitleEn,
		SeoTitleAr:       body.SeoTitleAr,
		SeoDescriptionEn: body.SeoDescriptionEn,
		SeoDescriptionAr: body.SeoDescriptionAr,
		Blocks:           blocks,
		IsVisible:        isVisible,
		InHeader:         inHeader,
		InFooter:         inFooter,
		SortOrder:        sortOrder,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, formatPage(created))
}

func (h *handler) updatePage(c echo.Context) error {
	id := c.Param("id")
	var body pageBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	blocks := body.Blocks
	if len(blocks) == 0 {
		blocks = json.RawMessage(`[]`)
	}
	isVisible := true
	if body.IsVisible != nil {
		isVisible = *body.IsVisible
	}
	inHeader := false
	if body.InHeader != nil {
		inHeader = *body.InHeader
	}
	inFooter := false
	if body.InFooter != nil {
		inFooter = *body.InFooter
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}
	pageType := "custom"
	if body.PageType != "" {
		pageType = body.PageType
	}

	updated, err := h.svc.UpdatePage(c.Request().Context(), sqlcdb.UpdatePageParams{
		ID:               id,
		Slug:             body.Slug,
		PageType:         pageType,
		TitleEn:          body.TitleEn,
		TitleAr:          body.TitleAr,
		SeoTitleEn:       body.SeoTitleEn,
		SeoTitleAr:       body.SeoTitleAr,
		SeoDescriptionEn: body.SeoDescriptionEn,
		SeoDescriptionAr: body.SeoDescriptionAr,
		Blocks:           blocks,
		IsVisible:        isVisible,
		InHeader:         inHeader,
		InFooter:         inFooter,
		SortOrder:        sortOrder,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatPage(updated))
}

func (h *handler) deletePage(c echo.Context) error {
	if err := h.svc.DeletePage(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Articles Handlers
func (h *handler) getArticleBySlug(c echo.Context) error {
	a, err := h.svc.GetArticleBySlug(c.Request().Context(), c.Param("slug"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, formatArticle(a))
}

func (h *handler) getArticleByID(c echo.Context) error {
	a, err := h.svc.GetArticleByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, formatArticle(a))
}

func (h *handler) listArticles(c echo.Context) error {
	all, _ := strconv.ParseBool(c.QueryParam("all"))
	articles, err := h.svc.ListArticles(c.Request().Context(), all)
	if err != nil {
		return err
	}
	out := make([]articleJSON, len(articles))
	for i, a := range articles {
		out[i] = formatArticle(a)
	}
	return c.JSON(http.StatusOK, out)
}

type articleBody struct {
	Slug             string          `json:"slug"`
	TitleEn          string          `json:"titleEn"`
	TitleAr          string          `json:"titleAr"`
	ExcerptEn        *string         `json:"excerptEn"`
	ExcerptAr        *string         `json:"excerptAr"`
	BodyEn           json.RawMessage `json:"bodyEn"`
	BodyAr           json.RawMessage `json:"bodyAr"`
	BodyHtmlEn       *string         `json:"bodyHtmlEn"`
	BodyHtmlAr       *string         `json:"bodyHtmlAr"`
	CoverUrl         *string         `json:"coverUrl"`
	Category         string          `json:"category"`
	Tags             []string        `json:"tags"`
	AuthorName       *string         `json:"authorName"`
	Status           string          `json:"status"`
	PublishAt        *time.Time      `json:"publishAt"`
	Featured         *bool           `json:"featured"`
	SeoTitleEn       *string         `json:"seoTitleEn"`
	SeoTitleAr       *string         `json:"seoTitleAr"`
	SeoDescriptionEn *string         `json:"seoDescriptionEn"`
	SeoDescriptionAr *string         `json:"seoDescriptionAr"`
}

func (h *handler) createArticle(c echo.Context) error {
	var body articleBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	category := "news"
	if body.Category != "" {
		category = body.Category
	}
	status := "draft"
	if body.Status != "" {
		status = body.Status
	}
	featured := false
	if body.Featured != nil {
		featured = *body.Featured
	}
	tags := body.Tags
	if tags == nil {
		tags = []string{}
	}

	created, err := h.svc.CreateArticle(c.Request().Context(), sqlcdb.CreateArticleParams{
		Slug:             body.Slug,
		TitleEn:          body.TitleEn,
		TitleAr:          body.TitleAr,
		ExcerptEn:        body.ExcerptEn,
		ExcerptAr:        body.ExcerptAr,
		BodyEn:           body.BodyEn,
		BodyAr:           body.BodyAr,
		BodyHtmlEn:       body.BodyHtmlEn,
		BodyHtmlAr:       body.BodyHtmlAr,
		CoverUrl:         body.CoverUrl,
		Category:         category,
		Tags:             tags,
		AuthorName:       body.AuthorName,
		Status:           status,
		PublishAt:        body.PublishAt,
		Featured:         featured,
		SeoTitleEn:       body.SeoTitleEn,
		SeoTitleAr:       body.SeoTitleAr,
		SeoDescriptionEn: body.SeoDescriptionEn,
		SeoDescriptionAr: body.SeoDescriptionAr,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, formatArticle(created))
}

func (h *handler) updateArticle(c echo.Context) error {
	id := c.Param("id")
	var body articleBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	category := "news"
	if body.Category != "" {
		category = body.Category
	}
	status := "draft"
	if body.Status != "" {
		status = body.Status
	}
	featured := false
	if body.Featured != nil {
		featured = *body.Featured
	}
	tags := body.Tags
	if tags == nil {
		tags = []string{}
	}

	updated, err := h.svc.UpdateArticle(c.Request().Context(), sqlcdb.UpdateArticleParams{
		ID:               id,
		Slug:             body.Slug,
		TitleEn:          body.TitleEn,
		TitleAr:          body.TitleAr,
		ExcerptEn:        body.ExcerptEn,
		ExcerptAr:        body.ExcerptAr,
		BodyEn:           body.BodyEn,
		BodyAr:           body.BodyAr,
		BodyHtmlEn:       body.BodyHtmlEn,
		BodyHtmlAr:       body.BodyHtmlAr,
		CoverUrl:         body.CoverUrl,
		Category:         category,
		Tags:             tags,
		AuthorName:       body.AuthorName,
		Status:           status,
		PublishAt:        body.PublishAt,
		Featured:         featured,
		SeoTitleEn:       body.SeoTitleEn,
		SeoTitleAr:       body.SeoTitleAr,
		SeoDescriptionEn: body.SeoDescriptionEn,
		SeoDescriptionAr: body.SeoDescriptionAr,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatArticle(updated))
}

func (h *handler) deleteArticle(c echo.Context) error {
	if err := h.svc.DeleteArticle(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Reviews Handlers
func (h *handler) listReviews(c echo.Context) error {
	all, _ := strconv.ParseBool(c.QueryParam("all"))
	reviews, err := h.svc.ListReviews(c.Request().Context(), all)
	if err != nil {
		return err
	}
	out := make([]reviewJSON, len(reviews))
	for i, r := range reviews {
		out[i] = formatReview(r)
	}
	return c.JSON(http.StatusOK, out)
}

type reviewBody struct {
	AuthorEn   string  `json:"authorEn"`
	AuthorAr   string  `json:"authorAr"`
	CompanyEn  *string `json:"companyEn"`
	CompanyAr  *string `json:"companyAr"`
	QuoteEn    string  `json:"quoteEn"`
	QuoteAr    string  `json:"quoteAr"`
	Rating     *int32  `json:"rating"`
	IsApproved *bool   `json:"isApproved"`
	SortOrder  *int32  `json:"sortOrder"`
	Year       string  `json:"year"`
}

func (h *handler) createReview(c echo.Context) error {
	var body reviewBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	var rating int32 = 5
	if body.Rating != nil {
		rating = *body.Rating
	}
	isApproved := false
	if body.IsApproved != nil {
		isApproved = *body.IsApproved
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}
	year := "2026"
	if body.Year != "" {
		year = body.Year
	}

	created, err := h.svc.CreateReview(c.Request().Context(), sqlcdb.CreateReviewParams{
		AuthorEn:   body.AuthorEn,
		AuthorAr:   body.AuthorAr,
		CompanyEn:  body.CompanyEn,
		CompanyAr:  body.CompanyAr,
		QuoteEn:    body.QuoteEn,
		QuoteAr:    body.QuoteAr,
		Rating:     rating,
		IsApproved: isApproved,
		SortOrder:  sortOrder,
		Year:       year,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, formatReview(created))
}

func (h *handler) updateReview(c echo.Context) error {
	id := c.Param("id")
	var body reviewBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	var rating int32 = 5
	if body.Rating != nil {
		rating = *body.Rating
	}
	isApproved := false
	if body.IsApproved != nil {
		isApproved = *body.IsApproved
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}
	year := "2026"
	if body.Year != "" {
		year = body.Year
	}

	updated, err := h.svc.UpdateReview(c.Request().Context(), sqlcdb.UpdateReviewParams{
		ID:         id,
		AuthorEn:   body.AuthorEn,
		AuthorAr:   body.AuthorAr,
		CompanyEn:  body.CompanyEn,
		CompanyAr:  body.CompanyAr,
		QuoteEn:    body.QuoteEn,
		QuoteAr:    body.QuoteAr,
		Rating:     rating,
		IsApproved: isApproved,
		SortOrder:  sortOrder,
		Year:       year,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatReview(updated))
}

func (h *handler) deleteReview(c echo.Context) error {
	if err := h.svc.DeleteReview(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// FAQs Handlers
func (h *handler) listFAQs(c echo.Context) error {
	all, _ := strconv.ParseBool(c.QueryParam("all"))
	faqs, err := h.svc.ListFAQs(c.Request().Context(), all)
	if err != nil {
		return err
	}
	out := make([]faqJSON, len(faqs))
	for i, f := range faqs {
		out[i] = formatFAQ(f)
	}
	return c.JSON(http.StatusOK, out)
}

type faqBody struct {
	QuestionEn  string `json:"questionEn"`
	QuestionAr  string `json:"questionAr"`
	AnswerEn    string `json:"answerEn"`
	AnswerAr    string `json:"answerAr"`
	Category    string `json:"category"`
	IsPublished *bool  `json:"isPublished"`
	SortOrder   *int32 `json:"sortOrder"`
}

func (h *handler) createFAQ(c echo.Context) error {
	var body faqBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	category := "general"
	if body.Category != "" {
		category = body.Category
	}
	isPublished := true
	if body.IsPublished != nil {
		isPublished = *body.IsPublished
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}

	created, err := h.svc.CreateFAQ(c.Request().Context(), sqlcdb.CreateFAQParams{
		QuestionEn:  body.QuestionEn,
		QuestionAr:  body.QuestionAr,
		AnswerEn:    body.AnswerEn,
		AnswerAr:    body.AnswerAr,
		Category:    category,
		IsPublished: isPublished,
		SortOrder:   sortOrder,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, formatFAQ(created))
}

func (h *handler) updateFAQ(c echo.Context) error {
	id := c.Param("id")
	var body faqBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	category := "general"
	if body.Category != "" {
		category = body.Category
	}
	isPublished := true
	if body.IsPublished != nil {
		isPublished = *body.IsPublished
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}

	updated, err := h.svc.UpdateFAQ(c.Request().Context(), sqlcdb.UpdateFAQParams{
		ID:          id,
		QuestionEn:  body.QuestionEn,
		QuestionAr:  body.QuestionAr,
		AnswerEn:    body.AnswerEn,
		AnswerAr:    body.AnswerAr,
		Category:    category,
		IsPublished: isPublished,
		SortOrder:   sortOrder,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatFAQ(updated))
}

func (h *handler) deleteFAQ(c echo.Context) error {
	if err := h.svc.DeleteFAQ(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Statistics Handlers
func (h *handler) listStatistics(c echo.Context) error {
	stats, err := h.svc.ListStatistics(c.Request().Context())
	if err != nil {
		return err
	}
	out := make([]statisticJSON, len(stats))
	for i, s := range stats {
		out[i] = formatStatistic(s)
	}
	return c.JSON(http.StatusOK, out)
}

type statisticBody struct {
	ID          string  `json:"id"`
	MetricValue string  `json:"metricValue"`
	LabelEn     string  `json:"labelEn"`
	LabelAr     string  `json:"labelAr"`
	SubLabelEn  *string `json:"subLabelEn"`
	SubLabelAr  *string `json:"subLabelAr"`
	Icon        *string `json:"icon"`
	SortOrder   *int32  `json:"sortOrder"`
}

func (h *handler) upsertStatistic(c echo.Context) error {
	var body statisticBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	var sortOrder int32 = 0
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}

	saved, err := h.svc.UpsertStatistic(c.Request().Context(), sqlcdb.UpsertStatisticParams{
		ID:          body.ID,
		MetricValue: body.MetricValue,
		LabelEn:     body.LabelEn,
		LabelAr:     body.LabelAr,
		SubLabelEn:  body.SubLabelEn,
		SubLabelAr:  body.SubLabelAr,
		Icon:        body.Icon,
		SortOrder:   sortOrder,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatStatistic(saved))
}

func (h *handler) deleteStatistic(c echo.Context) error {
	if err := h.svc.DeleteStatistic(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Content Snapshots Handlers
func (h *handler) getContentSnapshot(c echo.Context) error {
	snap, err := h.svc.GetContentSnapshot(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatSnapshot(snap))
}

func (h *handler) saveDraft(c echo.Context) error {
	id := c.Param("id")
	var draft json.RawMessage
	if err := c.Bind(&draft); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	snap, err := h.svc.SaveDraft(c.Request().Context(), id, draft)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatSnapshot(snap))
}

func (h *handler) publishSnapshot(c echo.Context) error {
	id := c.Param("id")
	snap, err := h.svc.PublishContent(c.Request().Context(), id)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, formatSnapshot(snap))
}

// Serialization types
type pageJSON struct {
	ID               string          `json:"id"`
	Slug             string          `json:"slug"`
	PageType         string          `json:"pageType"`
	TitleEn          string          `json:"titleEn"`
	TitleAr          string          `json:"titleAr"`
	SeoTitleEn       *string         `json:"seoTitleEn"`
	SeoTitleAr       *string         `json:"seoTitleAr"`
	SeoDescriptionEn *string         `json:"seoDescriptionEn"`
	SeoDescriptionAr *string         `json:"seoDescriptionAr"`
	Blocks           json.RawMessage `json:"blocks"`
	IsVisible        bool            `json:"isVisible"`
	InHeader         bool            `json:"inHeader"`
	InFooter         bool            `json:"inFooter"`
	SortOrder        int32           `json:"sortOrder"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

func formatPage(p postgres.Page) pageJSON {
	return pageJSON{
		ID:               p.ID,
		Slug:             p.Slug,
		PageType:         p.PageType,
		TitleEn:          p.TitleEn,
		TitleAr:          p.TitleAr,
		SeoTitleEn:       p.SeoTitleEn,
		SeoTitleAr:       p.SeoTitleAr,
		SeoDescriptionEn: p.SeoDescriptionEn,
		SeoDescriptionAr: p.SeoDescriptionAr,
		Blocks:           p.Blocks,
		IsVisible:        p.IsVisible,
		InHeader:         p.InHeader,
		InFooter:         p.InFooter,
		SortOrder:        p.SortOrder,
		CreatedAt:        p.CreatedAt,
		UpdatedAt:        p.UpdatedAt,
	}
}

type articleJSON struct {
	ID               string          `json:"id"`
	Slug             string          `json:"slug"`
	TitleEn          string          `json:"titleEn"`
	TitleAr          string          `json:"titleAr"`
	ExcerptEn        *string         `json:"excerptEn"`
	ExcerptAr        *string         `json:"excerptAr"`
	BodyEn           json.RawMessage `json:"bodyEn"`
	BodyAr           json.RawMessage `json:"bodyAr"`
	BodyHtmlEn       *string         `json:"bodyHtmlEn"`
	BodyHtmlAr       *string         `json:"bodyHtmlAr"`
	CoverUrl         *string         `json:"coverUrl"`
	Category         string          `json:"category"`
	Tags             []string        `json:"tags"`
	AuthorName       *string         `json:"authorName"`
	Status           string          `json:"status"`
	PublishAt        *time.Time      `json:"publishAt"`
	Featured         bool            `json:"featured"`
	SeoTitleEn       *string         `json:"seoTitleEn"`
	SeoTitleAr       *string         `json:"seoTitleAr"`
	SeoDescriptionEn *string         `json:"seoDescriptionEn"`
	SeoDescriptionAr *string         `json:"seoDescriptionAr"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

func formatArticle(a postgres.Article) articleJSON {
	return articleJSON{
		ID:               a.ID,
		Slug:             a.Slug,
		TitleEn:          a.TitleEn,
		TitleAr:          a.TitleAr,
		ExcerptEn:        a.ExcerptEn,
		ExcerptAr:        a.ExcerptAr,
		BodyEn:           a.BodyEn,
		BodyAr:           a.BodyAr,
		BodyHtmlEn:       a.BodyHtmlEn,
		BodyHtmlAr:       a.BodyHtmlAr,
		CoverUrl:         a.CoverUrl,
		Category:         a.Category,
		Tags:             a.Tags,
		AuthorName:       a.AuthorName,
		Status:           a.Status,
		PublishAt:        a.PublishAt,
		Featured:         a.Featured,
		SeoTitleEn:       a.SeoTitleEn,
		SeoTitleAr:       a.SeoTitleAr,
		SeoDescriptionEn: a.SeoDescriptionEn,
		SeoDescriptionAr: a.SeoDescriptionAr,
		CreatedAt:        a.CreatedAt,
		UpdatedAt:        a.UpdatedAt,
	}
}

type reviewJSON struct {
	ID         string    `json:"id"`
	AuthorEn   string    `json:"authorEn"`
	AuthorAr   string    `json:"authorAr"`
	CompanyEn  *string   `json:"companyEn"`
	CompanyAr  *string   `json:"companyAr"`
	QuoteEn    string    `json:"quoteEn"`
	QuoteAr    string    `json:"quoteAr"`
	Rating     int32     `json:"rating"`
	IsApproved bool      `json:"isApproved"`
	SortOrder  int32     `json:"sortOrder"`
	Year       string    `json:"year"`
	CreatedAt  time.Time `json:"createdAt"`
}

func formatReview(r postgres.Review) reviewJSON {
	return reviewJSON{
		ID:         r.ID,
		AuthorEn:   r.AuthorEn,
		AuthorAr:   r.AuthorAr,
		CompanyEn:  r.CompanyEn,
		CompanyAr:  r.CompanyAr,
		QuoteEn:    r.QuoteEn,
		QuoteAr:    r.QuoteAr,
		Rating:     r.Rating,
		IsApproved: r.IsApproved,
		SortOrder:  r.SortOrder,
		Year:       r.Year,
		CreatedAt:  r.CreatedAt,
	}
}

type faqJSON struct {
	ID          string    `json:"id"`
	QuestionEn  string    `json:"questionEn"`
	QuestionAr  string    `json:"questionAr"`
	AnswerEn    string    `json:"answerEn"`
	AnswerAr    string    `json:"answerAr"`
	Category    string    `json:"category"`
	IsPublished bool      `json:"isPublished"`
	SortOrder   int32     `json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
}

func formatFAQ(f postgres.FAQ) faqJSON {
	return faqJSON{
		ID:          f.ID,
		QuestionEn:  f.QuestionEn,
		QuestionAr:  f.QuestionAr,
		AnswerEn:    f.AnswerEn,
		AnswerAr:    f.AnswerAr,
		Category:    f.Category,
		IsPublished: f.IsPublished,
		SortOrder:   f.SortOrder,
		CreatedAt:   f.CreatedAt,
	}
}

type statisticJSON struct {
	ID          string  `json:"id"`
	MetricValue string  `json:"metricValue"`
	LabelEn     string  `json:"labelEn"`
	LabelAr     string  `json:"labelAr"`
	SubLabelEn  *string `json:"subLabelEn"`
	SubLabelAr  *string `json:"subLabelAr"`
	Icon        *string `json:"icon"`
	SortOrder   int32   `json:"sortOrder"`
}

func formatStatistic(s postgres.Statistic) statisticJSON {
	return statisticJSON{
		ID:          s.ID,
		MetricValue: s.MetricValue,
		LabelEn:     s.LabelEn,
		LabelAr:     s.LabelAr,
		SubLabelEn:  s.SubLabelEn,
		SubLabelAr:  s.SubLabelAr,
		Icon:        s.Icon,
		SortOrder:   s.SortOrder,
	}
}

type snapshotJSON struct {
	ID          string          `json:"id"`
	Draft       json.RawMessage `json:"draft"`
	Published   json.RawMessage `json:"published"`
	Revision    int32           `json:"revision"`
	PublishedAt *time.Time      `json:"publishedAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

func formatSnapshot(s postgres.ContentSnapshot) snapshotJSON {
	return snapshotJSON{
		ID:          s.ID,
		Draft:       s.Draft,
		Published:   s.Published,
		Revision:    s.Revision,
		PublishedAt: s.PublishedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}
