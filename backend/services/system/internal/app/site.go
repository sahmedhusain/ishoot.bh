package app
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/services/system/internal/postgres"
)
var ErrDomainsMustDiffer = errors.New("domains must differ")
const MaxSiteHTML = 50_000
type SiteCode struct {
	GoogleAnalyticsID	string	`json:"googleAnalyticsId"`
	MetaPixelID		string	`json:"metaPixelId"`
	TiktokPixelID		string	`json:"tiktokPixelId"`
	HeadHTML		string	`json:"headHtml"`
	BodyHTML		string	`json:"bodyHtml"`
}
type Site struct {
	WebsiteDomain	string		`json:"websiteDomain"`
	AdminDomain	string		`json:"adminDomain"`
	Code		SiteCode	`json:"code"`
	UpdatedBy	*string		`json:"updatedBy,omitempty"`
	UpdatedAt	*time.Time	`json:"updatedAt,omitempty"`
}
var (
	domainLabel	= regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)
	topLevelLabel	= regexp.MustCompile(`^[a-z]{2,63}$`)
	urlScheme	= regexp.MustCompile(`^[a-z][a-z0-9+.-]*://`)
	googleAnalyticsID	= regexp.MustCompile(`^G-[A-Z0-9]{4,20}$`)
	metaPixelID		= regexp.MustCompile(`^\d{6,20}$`)
	tiktokPixelID		= regexp.MustCompile(`^[A-Z0-9]{8,30}$`)
)
func NormalizeDomain(input string) string {
	value := strings.ToLower(strings.TrimSpace(input))
	if value == "" {
		return ""
	}
	value = urlScheme.ReplaceAllString(value, "")
	if i := strings.IndexAny(value, "/?#"); i >= 0 {
		value = value[:i]
	}
	value = strings.TrimSuffix(value, ".")
	if strings.ContainsAny(value, "@:") {
		return ""
	}
	labels := strings.Split(value, ".")
	if len(labels) < 2 || len(value) > 253 {
		return ""
	}
	for _, label := range labels {
		if !domainLabel.MatchString(label) {
			return ""
		}
	}
	if !topLevelLabel.MatchString(labels[len(labels)-1]) {
		return ""
	}
	if value == "localhost" || strings.HasSuffix(value, ".localhost") || strings.HasSuffix(value, ".local") {
		return ""
	}
	return value
}
func ValidateSiteCode(in SiteCode) (SiteCode, error) {
	id := func(name, value string, pattern *regexp.Regexp) (string, error) {
		value = strings.TrimSpace(value)
		if value != "" && (len(value) > 40 || !pattern.MatchString(value)) {
			return "", fmt.Errorf("%w: invalid %s", ErrValidationFailed, name)
		}
		return value, nil
	}
	var out SiteCode
	var err error
	if out.GoogleAnalyticsID, err = id("googleAnalyticsId", in.GoogleAnalyticsID, googleAnalyticsID); err != nil {
		return SiteCode{}, err
	}
	if out.MetaPixelID, err = id("metaPixelId", in.MetaPixelID, metaPixelID); err != nil {
		return SiteCode{}, err
	}
	if out.TiktokPixelID, err = id("tiktokPixelId", in.TiktokPixelID, tiktokPixelID); err != nil {
		return SiteCode{}, err
	}
	for name, value := range map[string]string{"headHtml": in.HeadHTML, "bodyHtml": in.BodyHTML} {
		if utf8.RuneCountInString(value) > MaxSiteHTML {
			return SiteCode{}, fmt.Errorf("%w: %s is longer than %d characters", ErrValidationFailed, name, MaxSiteHTML)
		}
	}
	out.HeadHTML, out.BodyHTML = in.HeadHTML, in.BodyHTML
	return out, nil
}
func (s *Service) Site(ctx context.Context) (Site, error) {
	record, err := s.store.Site(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return Site{}, nil
	}
	if err != nil {
		return Site{}, err
	}
	out := Site{UpdatedBy: record.UpdatedBy}
	at := record.UpdatedAt
	out.UpdatedAt = &at
	if record.WebsiteDomain != nil {
		out.WebsiteDomain = *record.WebsiteDomain
	}
	if record.AdminDomain != nil {
		out.AdminDomain = *record.AdminDomain
	}
	if len(record.Code) > 0 {
		if err := json.Unmarshal(record.Code, &out.Code); err != nil {
			return Site{}, fmt.Errorf("site code: %w", err)
		}
	}
	return out, nil
}
func (s *Service) SetSiteDomains(ctx context.Context, website, admin, by string) (Site, error) {
	normalized := [2]string{NormalizeDomain(website), NormalizeDomain(admin)}
	for i, raw := range []string{website, admin} {
		if strings.TrimSpace(raw) != "" && normalized[i] == "" {
			return Site{}, fmt.Errorf("%w: invalid domain %q", ErrValidationFailed, raw)
		}
	}
	if normalized[0] != "" && normalized[0] == normalized[1] {
		return Site{}, ErrDomainsMustDiffer
	}
	optional := func(v string) *string {
		if v == "" {
			return nil
		}
		return &v
	}
	event := DomainsChanged{WebsiteDomain: normalized[0], AdminDomain: normalized[1], ChangedBy: by}
	if err := s.change(ctx, EventDomainsChanged, event, func(st *postgres.Store) error {
		return st.SetSiteDomains(ctx, optional(normalized[0]), optional(normalized[1]), by, s.now())
	}); err != nil {
		return Site{}, err
	}
	return s.Site(ctx)
}
func (s *Service) SetSiteCode(ctx context.Context, in SiteCode, by string) (Site, error) {
	code, err := ValidateSiteCode(in)
	if err != nil {
		return Site{}, err
	}
	raw, err := json.Marshal(code)
	if err != nil {
		return Site{}, err
	}
	if err := s.change(ctx, EventSiteCodeChanged, SiteCodeChanged{ChangedBy: by}, func(st *postgres.Store) error {
		return st.SetSiteCode(ctx, raw, by, s.now())
	}); err != nil {
		return Site{}, err
	}
	return s.Site(ctx)
}
