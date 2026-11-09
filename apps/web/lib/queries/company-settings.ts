import {
  getCompanyConfiguration,
} from "@platform/api-client";
import {
  normalizeTheme,
  type BrandTheme,
} from "../constants/theme";
import { db } from "../atomic";
import {
  normalizeLanguages,
  normalizePrimaryLanguage,
} from "../constants/languages";
import { isBusinessActivity } from "../website-presets";
import { CompanySettings, SupportedCurrency } from "../types";
import { getSiteSettings } from "./site";

/**
 * The domains belong to the system service (IT); they are read with the rest for the pages that link with them. When
 * the service cannot be reached they are left out, so pages fall back to WEB_URL / ADMIN_URL instead of failing.
 */
async function mapSettings(s: any): Promise<CompanySettings> {
  const site = await getSiteSettings().catch((error) => {
    console.error("Site domains unavailable:", error);
    return { websiteDomain: "", adminDomain: "" };
  });
  return {
    id: s.id,
    company_name_en: s.companyNameEn,
    company_name_ar: s.companyNameAr,
    cr_number: s.crNumber || "",
    vat_id: s.vatId || undefined,
    vat_enabled: s.vatEnabled,
    vat_percentage: Number(s.vatPercentage),
    vat_certificate_url: s.vatCertificateUrl || undefined,
    default_currency: s.defaultCurrency as SupportedCurrency,
    currency_decimals: s.currencyDecimals,
    address_en: s.addressEn || "",
    address_ar: s.addressAr || "",
    phone: s.phone || "",
    email: s.email || "",
    website: s.website || "",
    bank_name: s.bankName || "",
    bank_iban: s.bankIban || "",
    bank_account_number: s.bankAccountNumber || "",
    bank_swift: s.bankSwift || "",
    time_zone: s.timeZone || "UTC",
    full_logo_url: s.fullLogoUrl || "",
    dark_full_logo_url: s.darkFullLogoUrl || "",
    document_header_url: s.documentHeaderUrl || "",
    document_footer_url: s.documentFooterUrl || "",
    logo_url: s.logoUrl || "",
    dark_logo_url: s.darkLogoUrl || "",
    logo_text_dark_url: s.logoUrl || "",
    logo_text_light_url: s.darkLogoUrl || "",
    icon_url: s.iconUrl || "",
    dark_icon_url: s.darkIconUrl || "",
    icon_light_url: s.iconUrl || "",
    icon_dark_url: s.darkIconUrl || "",
    stamp_url: s.stampUrl || undefined,
    signature_url: s.signatureUrl || undefined,
    whatsapp_phone: s.whatsappPhone || undefined,
    instagram_url: s.instagramUrl || undefined,
    linkedin_url: s.linkedinUrl || undefined,
    youtube_url: s.youtubeUrl || undefined,
    payment_terms_days: s.paymentTermsDays,
    default_discount_limit_percent: Number(s.defaultDiscountLimitPercent ?? 0),
    quotations_always_need_approval: Boolean(s.quotationsAlwaysNeedApproval),
    invoice_prefix: s.invoicePrefix,
    invoice_next_number: s.invoiceNextNumber,
    receipt_prefix: s.receiptPrefix,
    receipt_next_number: s.receiptNextNumber,
    ceo_name_en: s.ceoNameEn || undefined,
    ceo_name_ar: s.ceoNameAr || undefined,
    ceo_title_en: s.ceoTitleEn || undefined,
    ceo_title_ar: s.ceoTitleAr || undefined,
    ceo_quote_en: s.ceoQuoteEn || undefined,
    ceo_quote_ar: s.ceoQuoteAr || undefined,
    mission_en: s.missionEn || undefined,
    mission_ar: s.missionAr || undefined,
    vision_en: s.visionEn || undefined,
    vision_ar: s.visionAr || undefined,
    about_text_en: s.aboutTextEn || undefined,
    about_text_ar: s.aboutTextAr || undefined,
    terms_en: s.termsEn || undefined,
    terms_ar: s.termsAr || undefined,
    rules_en: s.rulesEn || undefined,
    rules_ar: s.rulesAr || undefined,
    theme: normalizeTheme(s.theme),
    setup_completed: Boolean(
      s.setupCompletedAt ||
      ((s.companyNameEn || s.companyNameAr) && (s.crNumber || s.email || s.phone))
    ),
    content_languages: normalizeLanguages(s.contentLanguages),
    primary_language: normalizePrimaryLanguage(
      s.primaryLanguage,
      normalizeLanguages(s.contentLanguages),
    ),
    business_activity: isBusinessActivity(s.businessActivity)
      ? s.businessActivity
      : null,
    tagline_en: s.taglineEn || undefined,
    tagline_ar: s.taglineAr || undefined,
    founded_year: s.foundedYear ?? undefined,
    city: s.city || undefined,
    country: s.country || undefined,
    map_url: s.mapUrl || undefined,
    website_domain: site.websiteDomain || undefined,
    admin_domain: site.adminDomain || undefined,
    updated_at: s.updatedAt.toISOString(),
  };
}

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const settings = await getCompanyConfiguration();
    return mapSettings({ ...settings, updatedAt: new Date(settings.updatedAt) });
  } catch (error) {
    return mapSettings({
      id: "unconfigured",
      companyNameEn: "",
      companyNameAr: "",
      defaultCurrency: "USD" as SupportedCurrency,
      currencyDecimals: 2,
      vatPercentage: 0,
      vatEnabled: false,
      theme: {},
      contentLanguages: ["en"],
      primaryLanguage: "en",
      updatedAt: new Date(),
    });
  }
}
