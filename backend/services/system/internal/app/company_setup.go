package app

import (
	"context"
	"errors"
)

type CompanySetupStatus struct {
	Complete bool     `json:"complete"`
	Missing  []string `json:"missing"`
	Finished bool     `json:"finished"`
}

func (s *Service) SetupStatus(ctx context.Context) (CompanySetupStatus, error) {
	out := CompanySetupStatus{Missing: []string{}}
	company, err := s.Company(ctx)
	if errors.Is(err, ErrCompanyMissing) {
		out.Missing = append(out.Missing, "company_settings_record")
		return out, nil
	}
	if err != nil {
		return out, err
	}
	missing := func(condition bool, key string) {
		if condition {
			out.Missing = append(out.Missing, key)
		}
	}
	empty := func(value *string) bool { return value == nil || *value == "" }
	missing(company.CompanyNameEn == "", "company_name_en")
	missing(company.CompanyNameAr == "", "company_name_ar")
	missing(empty(company.AddressEn), "address_en")
	missing(empty(company.Phone) && empty(company.Email), "contact_info")
	missing(company.VatEnabled && empty(company.VatId), "vat_id")
	missing(empty(company.CrNumber), "cr_number")
	missing(empty(company.LogoUrl), "logo_url")
	missing(empty(company.IconUrl), "icon_url")
	missing(!company.WebsitePublished, "website_publication")
	out.Complete = len(out.Missing) == 0
	out.Finished = company.SetupCompletedAt != nil || (len(out.Missing) == 0 && company.CompanyNameEn != "")
	return out, nil
}
