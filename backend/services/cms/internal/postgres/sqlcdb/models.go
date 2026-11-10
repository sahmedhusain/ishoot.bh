package sqlcdb
import (
	"encoding/json"
	"time"
)
type CmsArticle struct {
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
	CreatedAt		time.Time
	UpdatedAt		time.Time
}
type CmsContentSnapshot struct {
	ID		string
	Draft		json.RawMessage
	Published	[]byte
	Revision	int32
	PublishedAt	*time.Time
	UpdatedAt	time.Time
}
type CmsFaq struct {
	ID		string
	QuestionEn	string
	QuestionAr	string
	AnswerEn	string
	AnswerAr	string
	Category	string
	IsPublished	bool
	SortOrder	int32
	CreatedAt	time.Time
}
type CmsInbox struct {
	Consumer	string
	EventID		string
	HandledAt	time.Time
}
type CmsOutbox struct {
	ID		string
	Subject		string
	Payload		json.RawMessage
	Headers		json.RawMessage
	CreatedAt	time.Time
	PublishedAt	*time.Time
	Attempts	int32
	NextTryAt	time.Time
	LastError	*string
}
type CmsPage struct {
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
	CreatedAt		time.Time
	UpdatedAt		time.Time
}
type CmsReview struct {
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
	CreatedAt	time.Time
}
type CmsStatistic struct {
	ID		string
	MetricValue	string
	LabelEn		string
	LabelAr		string
	SubLabelEn	*string
	SubLabelAr	*string
	Icon		*string
	SortOrder	int32
}
