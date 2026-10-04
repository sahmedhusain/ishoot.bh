import { db } from "../db";
import { CompanySettings, SupportedCurrency } from "../types";

function mapSettings(s: any): CompanySettings {
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
    updated_at: s.updatedAt.toISOString(),
  };
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const settings = await db.companySetting.findUnique({ where: { singleton: 1 } });
  if (!settings)
    throw new Error(
      "Company settings are missing. Run the production-safe database bootstrap before using the application.",
    );
  return mapSettings(settings);
}

export async function updateCompanySettings(
  updates: Partial<CompanySettings>,
): Promise<CompanySettings> {
  if (updates.company_name_en !== undefined && !updates.company_name_en.trim()) throw new Error("Company English name is required");
  if (updates.company_name_ar !== undefined && !updates.company_name_ar.trim()) throw new Error("Company Arabic name is required");
  const current = await getCompanySettings();
  // Private uploads may become company artwork only through the owned asset workflow.
  for(const field of ["logo_url","dark_logo_url","icon_url","dark_icon_url","stamp_url","signature_url"] as const){
    const value=updates[field];
    if(value && value!==current[field] && value.startsWith("/api/files/")){
      const upload=await db.uploadObject.findUnique({where:{fileUrl:value},select:{isPublic:true}});
      const asset=await db.attachment.findFirst({where:{fileUrl:value,entityType:"company_asset"},select:{id:true}});
      if(!upload || !asset || (!["stamp_url","signature_url"].includes(field) && !upload.isPublic)) throw new Error("Choose artwork from registered company assets");
    }
  }

  if ((updates.vat_enabled ?? current.vat_enabled) && !(updates.vat_id ?? current.vat_id)?.trim()) throw new Error("VAT registration is required when VAT is enabled");
  const updated = await db.companySetting.update({
    where: { id: current.id },
    data: {
      companyNameEn: updates.company_name_en,
      companyNameAr: updates.company_name_ar,
      crNumber: updates.cr_number,
      vatId: updates.vat_id,
      vatEnabled: updates.vat_enabled,
      vatPercentage: updates.vat_percentage,
      vatCertificateUrl: updates.vat_certificate_url,
      defaultCurrency: updates.default_currency,
      currencyDecimals: updates.currency_decimals,
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
      iconUrl: updates.icon_url ?? updates.icon_light_url,
      darkIconUrl: updates.dark_icon_url ?? updates.icon_dark_url,
      stampUrl: updates.stamp_url,
      signatureUrl: updates.signature_url,
      paymentTermsDays: updates.payment_terms_days,
      invoicePrefix: updates.invoice_prefix,

      receiptPrefix: updates.receipt_prefix,

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
    },
  });
  return mapSettings(updated);
}

export async function getSetupCompleteness() {
  const settings = await db.companySetting.findUnique({ where: { singleton: 1 } });
  if (!settings) return { complete: false, missing: ["company_settings_record"] };
  const missing: string[] = [];
  if (!settings.companyNameEn) missing.push("company_name_en");
  if (!settings.companyNameAr) missing.push("company_name_ar");
  if (!settings.addressEn) missing.push("address_en");
  if (!settings.phone && !settings.email) missing.push("contact_info");
  
  if (settings.vatEnabled && !settings.vatId) missing.push("vat_id");
  if (!settings.crNumber) missing.push("cr_number");
  
  if (!settings.logoUrl) missing.push("logo_url");
  if (!settings.iconUrl) missing.push("icon_url");
  
  // Publication check - let's see if website config exists and is published
  const website = await db.websiteContent.findUnique({ where: { id: "main" } });
  if (!website || !website.publishedAt) missing.push("website_publication");
  
  return {
    complete: missing.length === 0,
    missing,
  };
}
