import { isCountryCode } from "../constants/clients";
import { normalizeContactInput } from "./contact-validation";
import { formatPhoneE164, countryIso } from "../constants/phone";
import { serverMessages } from "@platform/locales";
import {
  getCompanyConfiguration,
  getCompanySetupStatus,
  lookupFile,
  lookupFiles,
  updateCompanyConfigurationForIT,
  completeCompanySetupForIT,
} from "@platform/api-client";
import { assertSupportedCurrency } from "../constants/finance";
import {
  isFontMimeType,
  normalizeTheme,
  type BrandTheme,
} from "../constants/theme";
import { getCurrencyDecimals } from "@platform/config/currency";
import {
  CONTENT_LANGUAGES,
  mirrorBilingual,
  normalizeLanguages,
  normalizePrimaryLanguage,
} from "../constants/languages";
import { isBusinessActivity } from "../website-presets";
import { safeWebsiteUrl } from "../website-config";
import { CompanySettings, SupportedCurrency } from "../types";
import { getSiteSettings } from "./site";

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
    updated_at: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const settings = await getCompanyConfiguration();
    return mapSettings(settings);
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
      contentLanguages: ["en", "ar"],
      primaryLanguage: "en",
      updatedAt: new Date(),
    });
  }
}

async function updateCompanySettingsInTransaction(
  input: Partial<CompanySettings>,
) {
  if (
    input.content_languages !== undefined &&
    (!Array.isArray(input.content_languages) ||
      !input.content_languages.length ||
      input.content_languages.some(
        (l) => !(CONTENT_LANGUAGES as readonly string[]).includes(l),
      ))
  )
    throw new Error(serverMessages.contentLanguagesInvalid);
  if (
    input.business_activity !== undefined &&
    input.business_activity !== null &&
    !isBusinessActivity(input.business_activity)
  )
    throw new Error(serverMessages.businessActivityInvalid);
  if (
    input.founded_year !== undefined &&
    input.founded_year !== null &&
    !(
      Number.isInteger(input.founded_year) &&
      input.founded_year >= 1800 &&
      input.founded_year <= new Date().getFullYear()
    )
  )
    throw new Error(serverMessages.invalidFoundedYear);
  if (input.map_url && !/^https?:\/\//.test(safeWebsiteUrl(input.map_url)))
    throw new Error(serverMessages.invalidMapLink);

  const stored = await getCompanyConfiguration();
  const languages = normalizeLanguages(
    input.content_languages ?? stored?.contentLanguages,
  );
  const updates = mirrorBilingual(input, languages);
  if (updates.country?.trim()) {
    const country =
      countryIso(updates.country) ?? updates.country.trim().toUpperCase();
    if (!isCountryCode(country))
      throw new Error(serverMessages.chooseACountryFromTheList);
    updates.country = country;
  }
  if (
    updates.vat_percentage !== undefined &&
    (!Number.isFinite(updates.vat_percentage) ||
      updates.vat_percentage < 0 ||
      updates.vat_percentage > 100)
  )
    throw new Error(serverMessages.invalidInput);
  if (
    updates.payment_terms_days !== undefined &&
    (!Number.isInteger(updates.payment_terms_days) ||
      updates.payment_terms_days < 0 ||
      updates.payment_terms_days > 365)
  )
    throw new Error(serverMessages.paymentTermsMustBeBetween0);
  if (updates.company_name_en !== undefined && !updates.company_name_en.trim())
    throw new Error(serverMessages.companyEnglishNameIsRequired);
  if (updates.company_name_ar !== undefined && !updates.company_name_ar.trim())
    throw new Error(serverMessages.companyArabicNameIsRequired);
  if (updates.default_currency !== undefined)
    assertSupportedCurrency(updates.default_currency);
  if (
    updates.default_discount_limit_percent !== undefined &&
    !(
      updates.default_discount_limit_percent >= 0 &&
      updates.default_discount_limit_percent <= 100
    )
  )
    throw new Error(serverMessages.theDiscountLimitMustBeBetween0);
  const contact = await normalizeContactInput(
    { email: updates.email, phone: updates.phone },
    updates.country ?? stored?.country ?? "",
  );
  updates.email = contact.email;
  updates.phone = contact.phone;
  if (updates.whatsapp_phone?.trim()) {
    const phone = formatPhoneE164(
      updates.whatsapp_phone,
      undefined,
      updates.country ?? stored?.country ?? "",
    );
    if (!phone) throw new Error(serverMessages.invalidPhoneNumber);
    updates.whatsapp_phone = phone;
  }
  for (const field of ["invoice_next_number", "receipt_next_number"] as const) {
    const next = updates[field];
    if (next === undefined) continue;
    if (!Number.isInteger(next) || next < 1)
      throw new Error(serverMessages.sequenceNumbersMustBePositiveWholeNumbers);
  }

  for (const field of [
    "logo_url",
    "dark_logo_url",
    "full_logo_url",
    "dark_full_logo_url",
    "icon_url",
    "dark_icon_url",
    "document_header_url",
    "document_footer_url",
    "stamp_url",
    "signature_url",
  ] as const) {
    const value = updates[field];
    if (value && value !== (await getCompanySettings())[field] && value.startsWith("/api/files/")) {
      const upload = await lookupFile(value);
      if (
        !upload ||
        (!["stamp_url", "signature_url"].includes(field) && !upload.isPublic)
      )
        throw new Error(
          serverMessages.chooseArtworkFromRegisteredCompanyAssets,
        );
    }
  }

  if (
    (updates.vat_enabled ?? stored?.vatEnabled) &&
    !(updates.vat_id ?? stored?.vatId)?.trim()
  )
    throw new Error(serverMessages.vatRegistrationIsRequiredWhenVatIs);

  const updated = await updateCompanyConfigurationForIT("service-token", {
    companyNameEn: updates.company_name_en,
    companyNameAr: updates.company_name_ar,
      crNumber: updates.cr_number,
      vatId: updates.vat_id,
      vatEnabled: updates.vat_enabled,
      vatPercentage: updates.vat_percentage,
      vatCertificateUrl: updates.vat_certificate_url,
      defaultCurrency: updates.default_currency,
      addressEn: updates.address_en,
      addressAr: updates.address_ar,
      phone: updates.phone,
      whatsappPhone: updates.whatsapp_phone,
      email: updates.email,
      website: updates.website,
      instagramUrl: updates.instagram_url,
      linkedinUrl: updates.linkedin_url,
      youtubeUrl: updates.youtube_url,
      bankName: updates.bank_name,
      bankIban: updates.bank_iban,
      bankAccountNumber: updates.bank_account_number,
      bankSwift: updates.bank_swift,
      logoUrl: updates.logo_url ?? updates.logo_text_dark_url,
      darkLogoUrl: updates.dark_logo_url ?? updates.logo_text_light_url,
      fullLogoUrl: updates.full_logo_url,
      darkFullLogoUrl: updates.dark_full_logo_url,
      documentHeaderUrl: updates.document_header_url,
      documentFooterUrl: updates.document_footer_url,
      timeZone: updates.time_zone,
      iconUrl: updates.icon_url ?? updates.icon_light_url,
      darkIconUrl: updates.dark_icon_url ?? updates.icon_dark_url,
      stampUrl: updates.stamp_url,
      signatureUrl: updates.signature_url,
      paymentTermsDays: updates.payment_terms_days,
      defaultDiscountLimitPercent: updates.default_discount_limit_percent,
      quotationsAlwaysNeedApproval: updates.quotations_always_need_approval,
      invoicePrefix: updates.invoice_prefix,
      invoiceNextNumber: updates.invoice_next_number,
      receiptPrefix: updates.receipt_prefix,
      receiptNextNumber: updates.receipt_next_number,
      ceoNameEn: updates.ceo_name_en,
      ceoNameAr: updates.ceo_name_ar,
      ceoTitleEn: updates.ceo_title_en,
      ceoTitleAr: updates.ceo_title_ar,
      ceoQuoteEn: updates.ceo_quote_en,
      ceoQuoteAr: updates.ceo_quote_ar,
      missionEn: updates.mission_en,
      missionAr: updates.mission_ar,
      visionEn: updates.vision_en,
      visionAr: updates.vision_ar,
      aboutTextEn: updates.about_text_en,
      aboutTextAr: updates.about_text_ar,
      termsEn: updates.terms_en,
      termsAr: updates.terms_ar,
      rulesEn: updates.rules_en,
      rulesAr: updates.rules_ar,
      contentLanguages: updates.content_languages
        ? normalizeLanguages(updates.content_languages)
        : undefined,
      primaryLanguage:
        updates.primary_language || updates.content_languages
          ? normalizePrimaryLanguage(updates.primary_language, languages)
          : undefined,
      businessActivity: updates.business_activity,
      taglineEn: updates.tagline_en,
      taglineAr: updates.tagline_ar,
      foundedYear: updates.founded_year,
      city: updates.city,
      country: updates.country,
      mapUrl: updates.map_url,
    } as any,
  );
  return mapSettings(updated);
}

export async function getSetupCompleteness() {
  const { complete, missing } = await getCompanySetupStatus();
  return { complete, missing };
}

export async function updateCompanyTheme(
  input: BrandTheme,
): Promise<CompanySettings> {
  // Theme updates are currently not exposed via a separate API endpoint in the client.
  // We would need an API endpoint to update company theme.
  throw new Error("updateCompanyTheme is not yet implemented via API");
}

export async function completeCompanySetup(): Promise<CompanySettings> {
  await completeCompanySetupForIT("service-token");
  return getCompanySettings();
}

export async function updateCompanySettings(
  input: Partial<CompanySettings>,
): Promise<CompanySettings> {
  return updateCompanySettingsInTransaction(input);
}