package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/big"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/contact"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/system/internal/postgres"
)

var ErrCompanyMissing = errors.New("company is not configured")
var ErrCurrencyLocked = errors.New("company currency already has monetary use")
var ErrSequenceBackwards = errors.New("document sequences only move forward")

func ptr[T any](value T) *T { return &value }
func newCompany(now time.Time) CompanyRecord {
	theme, _ := json.Marshal(defaultTheme())
	defaultCurrency := os.Getenv("DEFAULT_CURRENCY")
	if defaultCurrency == "" {
		defaultCurrency = "USD"
	}
	defaultDecimals := 2
	if defDecStr := os.Getenv("DEFAULT_CURRENCY_DECIMALS"); defDecStr != "" {
		if d, err := strconv.Atoi(defDecStr); err == nil {
			defaultDecimals = d
		}
	} else if defaultCurrency == "BHD" || defaultCurrency == "KWD" || defaultCurrency == "OMR" {
		defaultDecimals = 3
	}
	vatPercent := os.Getenv("DEFAULT_VAT_PERCENTAGE")
	if vatPercent == "" {
		vatPercent = "0.00"
	}
	timeZone := os.Getenv("DEFAULT_TIMEZONE")
	if timeZone == "" {
		timeZone = "UTC"
	}
	return CompanyRecord{
		ID:                          uuid.NewString(),
		DefaultCurrency:             defaultCurrency,
		CurrencyDecimals:            int64(defaultDecimals),
		VatPercentage:               json.Number(vatPercent),
		DefaultDiscountLimitPercent: "5.00",
		PaymentTermsDays:            30,
		InvoicePrefix:               "INV",
		InvoiceNextNumber:           1,
		ReceiptPrefix:               "RCT",
		ReceiptNextNumber:           1,
		TimeZone:                    ptr(timeZone),
		Theme:                       theme,
		ContentLanguages:            []string{"ar", "en"},
		PrimaryLanguage:             "ar",
		UpdatedAt:                   now,
	}
}
func companyRecord(ctx context.Context, store *postgres.Store, lock bool) (CompanyRecord, error) {
	row, err := store.Company(ctx, lock)
	if errors.Is(err, pgx.ErrNoRows) {
		return CompanyRecord{}, ErrCompanyMissing
	}
	if err != nil {
		return CompanyRecord{}, err
	}
	var out CompanyRecord
	if err := json.Unmarshal(row.Data, &out); err != nil {
		return out, err
	}
	out.ID = row.ID
	out.Revision = row.Revision
	out.CurrencyLocked = row.CurrencyLocked
	out.UpdatedAt = row.UpdatedAt
	sequences, err := store.DocumentSequences(ctx)
	if err != nil {
		return out, err
	}
	for _, seq := range sequences {
		if seq.Kind == "invoice" {
			out.InvoicePrefix, out.InvoiceNextNumber = seq.Prefix, seq.NextNumber
		} else if seq.Kind == "receipt" {
			out.ReceiptPrefix, out.ReceiptNextNumber = seq.Prefix, seq.NextNumber
		}
	}
	out.Theme, _ = json.Marshal(normalizeCompanyTheme(out.Theme))
	return out, nil
}
func (s *Service) Company(ctx context.Context) (CompanyRecord, error) {
	return companyRecord(ctx, s.store, false)
}
func percentage(value json.Number) (json.Number, error) {
	if len(value) > 128 {
		return "", ErrValidationFailed
	}
	numeric, err := strconv.ParseFloat(string(value), 64)
	if err != nil || math.IsNaN(numeric) || math.IsInf(numeric, 0) || numeric < 0 || numeric > 100 {
		return "", ErrValidationFailed
	}
	if numeric < 0.004 {
		return "0.00", nil
	}
	n, ok := new(big.Rat).SetString(string(value))
	if !ok || n.Sign() < 0 || n.Cmp(big.NewRat(100, 1)) > 0 {
		return "", ErrValidationFailed
	}
	n.Mul(n, big.NewRat(100, 1))
	whole, remainder := new(big.Int), new(big.Int)
	whole.QuoRem(n.Num(), n.Denom(), remainder)
	if new(big.Int).Lsh(remainder, 1).Cmp(n.Denom()) >= 0 {
		whole.Add(whole, big.NewInt(1))
	}
	cents := whole.Int64()
	return json.Number(fmt.Sprintf("%d.%02d", cents/100, cents%100)), nil
}
func normalizeCompany(next *CompanyRecord, current CompanyRecord, patch map[string]json.RawMessage, now time.Time) error {
	next.CompanyNameEn = strings.TrimSpace(next.CompanyNameEn)
	next.CompanyNameAr = strings.TrimSpace(next.CompanyNameAr)
	if next.CompanyNameEn == "" || next.CompanyNameAr == "" || len(next.CompanyNameEn) > 1000 || len(next.CompanyNameAr) > 1000 {
		return ErrValidationFailed
	}
	units, ok := catalog.CurrencyDecimals(next.DefaultCurrency)
	if !ok || next.DefaultCurrency != strings.ToUpper(strings.TrimSpace(next.DefaultCurrency)) {
		return ErrValidationFailed
	}
	next.CurrencyDecimals = int64(units)
	if current.CurrencyLocked && current.DefaultCurrency != next.DefaultCurrency {
		return ErrCurrencyLocked
	}
	var err error
	next.VatPercentage, err = percentage(next.VatPercentage)
	if err != nil {
		return err
	}
	next.DefaultDiscountLimitPercent, err = percentage(next.DefaultDiscountLimitPercent)
	if err != nil {
		return err
	}
	if next.PaymentTermsDays < 0 || next.PaymentTermsDays > 365 {
		return ErrValidationFailed
	}
	if next.InvoiceNextNumber < 1 || next.ReceiptNextNumber < 1 || next.InvoiceNextNumber > 2147483647 || next.ReceiptNextNumber > 2147483647 {
		return ErrValidationFailed
	}
	if next.InvoiceNextNumber < current.InvoiceNextNumber || next.ReceiptNextNumber < current.ReceiptNextNumber {
		return ErrSequenceBackwards
	}
	if len(next.InvoicePrefix) > 100 || len(next.ReceiptPrefix) > 100 || strings.ContainsAny(next.InvoicePrefix+next.ReceiptPrefix, "\r\n\t") {
		return ErrValidationFailed
	}
	if next.VatEnabled && (next.VatId == nil || strings.TrimSpace(*next.VatId) == "") {
		return ErrValidationFailed
	}
	if next.FoundedYear != nil && (*next.FoundedYear < 1800 || *next.FoundedYear > int64(now.Year())) {
		return ErrValidationFailed
	}
	if len(next.ContentLanguages) < 1 || len(next.ContentLanguages) > 2 {
		return ErrValidationFailed
	}
	seen := map[string]bool{}
	for _, lang := range next.ContentLanguages {
		if (lang != "ar" && lang != "en") || seen[lang] {
			return ErrValidationFailed
		}
		seen[lang] = true
	}
	if !seen[next.PrimaryLanguage] {
		next.PrimaryLanguage = next.ContentLanguages[0]
	}
	if next.BusinessActivity != nil && !catalog.IsBusinessActivity(*next.BusinessActivity) {
		return ErrValidationFailed
	}
	if next.TimeZone != nil && *next.TimeZone != "" {
		if _, err := time.LoadLocation(*next.TimeZone); err != nil {
			return ErrValidationFailed
		}
	}
	if _, ok := patch["country"]; ok && next.Country != nil {
		value, err := contact.Country(*next.Country)
		if err != nil {
			return ErrValidationFailed
		}
		next.Country = &value
	}
	country := ""
	if next.Country != nil {
		country = *next.Country
	}
	if _, ok := patch["email"]; ok && next.Email != nil {
		value, err := contact.Email(*next.Email)
		if err != nil {
			return ErrValidationFailed
		}
		next.Email = &value
	}
	for key, target := range map[string]**string{"phone": &next.Phone, "whatsappPhone": &next.WhatsappPhone} {
		if _, ok := patch[key]; ok && *target != nil {
			value, err := contact.Phone(**target, country)
			if err != nil {
				return ErrValidationFailed
			}
			*target = &value
		}
	}
	if next.MapUrl != nil && *next.MapUrl != "" {
		u, err := url.Parse(*next.MapUrl)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil {
			return ErrValidationFailed
		}
	}
	next.Theme, _ = json.Marshal(normalizeCompanyTheme(next.Theme))
	return nil
}
func mergeCompany(current CompanyRecord, patch map[string]json.RawMessage) (CompanyRecord, error) {
	raw, _ := json.Marshal(current)
	var values map[string]json.RawMessage
	if err := json.Unmarshal(raw, &values); err != nil {
		return current, err
	}
	updates := make(map[string]json.RawMessage, len(patch))
	for key, value := range patch {
		if !companyPatchFields[key] {
			return current, ErrValidationFailed
		}
		updates[key] = value
	}
	languages := current.ContentLanguages
	if value, ok := updates["contentLanguages"]; ok {
		if json.Unmarshal(value, &languages) != nil || len(languages) == 0 || len(languages) > 100 {
			return current, ErrValidationFailed
		}
		seen := map[string]bool{}
		for _, lang := range languages {
			if lang != "ar" && lang != "en" {
				return current, ErrValidationFailed
			}
			seen[lang] = true
		}
		languages = nil
		for _, lang := range []string{"ar", "en"} {
			if seen[lang] {
				languages = append(languages, lang)
			}
		}
		updates["contentLanguages"], _ = json.Marshal(languages)
	}
	if len(languages) == 1 {
		preferred, other := "En", "Ar"
		if languages[0] == "ar" {
			preferred, other = "Ar", "En"
		}
		for key, value := range updates {
			if !strings.HasSuffix(key, preferred) {
				continue
			}
			target := strings.TrimSuffix(key, preferred) + other
			if _, known := values[target]; !known {
				continue
			}
			var text string
			if string(value) == "null" || json.Unmarshal(value, &text) != nil {
				continue
			}
			existing, present := updates[target]
			var otherText string
			if !present || string(existing) == "null" || json.Unmarshal(existing, &otherText) == nil {
				updates[target] = value
			}
		}
	}
	for key, value := range updates {
		if string(value) == "null" {
			switch key {
			case "companyNameEn", "companyNameAr", "vatEnabled", "vatPercentage", "defaultCurrency", "paymentTermsDays", "invoicePrefix", "invoiceNextNumber", "receiptPrefix", "receiptNextNumber", "defaultDiscountLimitPercent", "quotationsAlwaysNeedApproval", "contentLanguages", "primaryLanguage":
				return current, ErrValidationFailed
			}
		}
		values[key] = value
	}
	raw, err := json.Marshal(values)
	if err != nil {
		return current, err
	}
	var out CompanyRecord
	err = json.Unmarshal(raw, &out)
	if err != nil {
		return out, ErrValidationFailed
	}
	return out, nil
}

func (s *Service) SaveCompany(ctx context.Context, patch map[string]json.RawMessage, by string) (CompanyRecord, error) {
	for key := range patch {
		if !companyPatchFields[key] {
			return CompanyRecord{}, ErrValidationFailed
		}
	}
	verified, err := s.companyFileProofs(ctx, patch)
	if err != nil {
		return CompanyRecord{}, err
	}
	var result CompanyRecord
	err = s.store.Tx(ctx, func(store *postgres.Store, tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", int64(0x535953434f)); err != nil {
			return err
		}
		current, err := companyRecord(ctx, store, true)
		if errors.Is(err, ErrCompanyMissing) {
			current = newCompany(s.now())
		} else if err != nil {
			return err
		}
		next, err := mergeCompany(current, patch)
		if err != nil {
			return err
		}
		if err := normalizeCompany(&next, current, patch, s.now()); err != nil {
			return err
		}
		if err := s.validateCompanyFiles(ctx, store, current, next, patch, verified); err != nil {
			return err
		}
		next.UpdatedAt = s.now()
		next.Revision = current.Revision + 1
		raw, err := json.Marshal(next)
		if err != nil {
			return err
		}
		if err := store.SaveCompany(ctx, next.ID, raw, by, next.UpdatedAt); err != nil {
			return err
		}
		if err := store.SaveSequence(ctx, "invoice", next.InvoicePrefix, next.InvoiceNextNumber); err != nil {
			return err
		}
		if err := store.SaveSequence(ctx, "receipt", next.ReceiptPrefix, next.ReceiptNextNumber); err != nil {
			return err
		}
		result = next
		return outbox.Enqueue(ctx, tx, "system", outbox.Event{Subject: "system.company.changed", Payload: map[string]any{"companyId": next.ID, "revision": next.Revision, "changedBy": by}})
	})
	return result, err
}
func (s *Service) MarkCurrencyUsed(ctx context.Context, by string) error {
	return s.store.Tx(ctx, func(store *postgres.Store, tx pgx.Tx) error {
		company, err := companyRecord(ctx, store, true)
		if err != nil {
			return err
		}
		if company.CurrencyLocked {
			return nil
		}
		if err := store.LockCompanyCurrency(ctx); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "system", outbox.Event{Subject: "system.company.currency_locked", Payload: map[string]any{"companyId": company.ID, "changedBy": by}})
	})
}
