package app

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

var ErrFileLookupUnavailable = errors.New("company file verification unavailable")

type CompanyFile struct {
	URL       string
	MIME      string
	Size      int64
	Public    bool
	ExpiresAt *time.Time
}

func (s *Service) SetFileLookup(lookup func(context.Context, string) (CompanyFile, error)) {
	s.fileLookup = lookup
}

var companyAssetKey = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,100}$`)

func (s *Service) file(ctx context.Context, url string) (CompanyFile, error) {
	if s.fileLookup == nil {
		return CompanyFile{}, ErrFileLookupUnavailable
	}
	return s.fileLookup(ctx, url)
}
func (s *Service) validateCompanyFiles(ctx context.Context, store *postgres.Store, current, next CompanyRecord, patch map[string]json.RawMessage, verified map[string]CompanyFile) error {
	artwork := map[string]struct{ old, next *string }{"logoUrl": {current.LogoUrl, next.LogoUrl}, "darkLogoUrl": {current.DarkLogoUrl, next.DarkLogoUrl}, "fullLogoUrl": {current.FullLogoUrl, next.FullLogoUrl}, "darkFullLogoUrl": {current.DarkFullLogoUrl, next.DarkFullLogoUrl}, "iconUrl": {current.IconUrl, next.IconUrl}, "darkIconUrl": {current.DarkIconUrl, next.DarkIconUrl}, "documentHeaderUrl": {current.DocumentHeaderUrl, next.DocumentHeaderUrl}, "documentFooterUrl": {current.DocumentFooterUrl, next.DocumentFooterUrl}, "stampUrl": {current.StampUrl, next.StampUrl}, "signatureUrl": {current.SignatureUrl, next.SignatureUrl}}
	for key, field := range artwork {
		if field.next == nil || *field.next == "" || !strings.HasPrefix(*field.next, "/api/files/") || (field.old != nil && *field.old == *field.next) {
			continue
		}
		if _, err := store.AssetByURL(ctx, *field.next); errors.Is(err, pgx.ErrNoRows) {
			return ErrValidationFailed
		} else if err != nil {
			return err
		}
		file, ok := verified[*field.next]
		if !ok {
			return ErrFileLookupUnavailable
		}
		if file.ExpiresAt != nil || !strings.HasPrefix(file.MIME, "image/") || ((key != "stampUrl" && key != "signatureUrl") && !file.Public) {
			return ErrValidationFailed
		}
	}
	if _, changed := patch["theme"]; changed {
		theme := normalizeCompanyTheme(next.Theme)
		for _, font := range []ThemeFont{theme.Fonts.Body, theme.Fonts.Heading} {
			if font.Kind != "upload" {
				continue
			}
			for _, entry := range font.Files {
				file, ok := verified[entry.URL]
				if !ok {
					return ErrFileLookupUnavailable
				}
				if !file.Public || file.ExpiresAt != nil || (file.MIME != "font/woff2" && file.MIME != "font/woff" && file.MIME != "font/ttf" && file.MIME != "font/otf") {
					return ErrValidationFailed
				}
			}
		}
	}
	return nil
}
func (s *Service) CompanyAssets(ctx context.Context) ([]sqlcdb.SystemCompanyAsset, error) {
	return s.store.Assets(ctx)
}
func (s *Service) SaveCompanyAsset(ctx context.Context, key, title, url, by string) error {
	if !companyAssetKey.MatchString(key) || strings.TrimSpace(title) == "" || len(title) > 500 || !strings.HasPrefix(url, "/api/files/") || len(url) > 2048 {
		return ErrValidationFailed
	}
	file, err := s.file(ctx, url)
	if err != nil {
		return err
	}
	if file.ExpiresAt != nil {
		return ErrValidationFailed
	}
	return s.store.Tx(ctx, func(store *postgres.Store, tx pgx.Tx) error {
		if err := store.SaveAsset(ctx, sqlcdb.SaveCompanyAssetParams{ID: uuid.NewString(), AssetKey: key, Title: strings.TrimSpace(title), FileUrl: url, MimeType: &file.MIME, FileSize: &file.Size, Now: s.now()}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "system", outbox.Event{Subject: "system.company_asset.changed", Payload: map[string]any{"assetKey": key, "changedBy": by, "operation": "save"}})
	})
}
func (s *Service) DeleteCompanyAsset(ctx context.Context, key, by string) error {
	if !companyAssetKey.MatchString(key) {
		return ErrValidationFailed
	}
	return s.store.Tx(ctx, func(store *postgres.Store, tx pgx.Tx) error {
		if err := store.DeleteAsset(ctx, key); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "system", outbox.Event{Subject: "system.company_asset.changed", Payload: map[string]any{"assetKey": key, "changedBy": by, "operation": "delete"}})
	})
}

// Resolve immutable upload metadata before acquiring company locks.
func (s *Service) companyFileProofs(ctx context.Context, patch map[string]json.RawMessage) (map[string]CompanyFile, error) {
	urls := map[string]bool{}
	for _, key := range []string{"logoUrl", "darkLogoUrl", "fullLogoUrl", "darkFullLogoUrl", "iconUrl", "darkIconUrl", "documentHeaderUrl", "documentFooterUrl", "stampUrl", "signatureUrl"} {
		var value string
		if json.Unmarshal(patch[key], &value) == nil && strings.HasPrefix(value, "/api/files/") {
			urls[value] = true
		}
	}
	if raw, ok := patch["theme"]; ok {
		theme := normalizeCompanyTheme(raw)
		for _, font := range []ThemeFont{theme.Fonts.Body, theme.Fonts.Heading} {
			if font.Kind == "upload" {
				for _, file := range font.Files {
					urls[file.URL] = true
				}
			}
		}
	}
	out := make(map[string]CompanyFile, len(urls))
	for url := range urls {
		file, err := s.file(ctx, url)
		if err != nil {
			return nil, err
		}
		out[url] = file
	}
	return out, nil
}
