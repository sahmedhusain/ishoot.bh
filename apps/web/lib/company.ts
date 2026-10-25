import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getCompanySettings } from "@platform/database";
import type { PublicCompanySettings } from "@platform/database/types";
const getCachedCompany = unstable_cache(
  getCompanySettings,
  ["public-company"],
  { revalidate: 60, tags: ["company"] },
);
export const getPublicCompanySettings = cache(
  async (): Promise<PublicCompanySettings> => {
    const company = await getCachedCompany();
    return {
      theme: company.theme,
      content_languages: company.content_languages,
      primary_language: company.primary_language,
      business_activity: company.business_activity,
      tagline_en: company.tagline_en,
      tagline_ar: company.tagline_ar,
      founded_year: company.founded_year,
      city: company.city,
      country: company.country,
      map_url: company.map_url,
      website_domain: company.website_domain,
      default_currency: company.default_currency,
      company_name_en: company.company_name_en,
      company_name_ar: company.company_name_ar,
      cr_number: company.cr_number,
      address_en: company.address_en,
      address_ar: company.address_ar,
      phone: company.phone,
      whatsapp_phone: company.whatsapp_phone,
      email: company.email,
      website: company.website,
      instagram_url: company.instagram_url,
      linkedin_url: company.linkedin_url,
      youtube_url: company.youtube_url,
      logo_url: company.logo_url,
      dark_logo_url: company.dark_logo_url,
      logo_text_dark_url: company.logo_text_dark_url,
      logo_text_light_url: company.logo_text_light_url,
      icon_url: company.icon_url,
      dark_icon_url: company.dark_icon_url,
      icon_light_url: company.icon_light_url,
      icon_dark_url: company.icon_dark_url,
      ceo_name_en: company.ceo_name_en,
      ceo_name_ar: company.ceo_name_ar,
      ceo_title_en: company.ceo_title_en,
      ceo_title_ar: company.ceo_title_ar,
      ceo_quote_en: company.ceo_quote_en,
      ceo_quote_ar: company.ceo_quote_ar,
      mission_en: company.mission_en,
      mission_ar: company.mission_ar,
      vision_en: company.vision_en,
      vision_ar: company.vision_ar,
      about_text_en: company.about_text_en,
      about_text_ar: company.about_text_ar,
      terms_en: company.terms_en,
      terms_ar: company.terms_ar,
      rules_en: company.rules_en,
      rules_ar: company.rules_ar,
    };
  },
);
