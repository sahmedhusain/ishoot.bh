import { db } from "../db";
import { CompanySettings, SupportedCurrency } from "../types";
import initialConfig from "../initial-company-config.json";

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
    default_currency: (s.defaultCurrency as SupportedCurrency) || "BHD",
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
    dark_logo_url: s.darkLogoUrl || undefined,
    icon_url: s.iconUrl || undefined,
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
    updated_at: s.updatedAt.toISOString(),
  };
}

export async function getCompanySettings(): Promise<CompanySettings> {
  let s = await db.companySetting.findFirst();
  if (!s) {
    s = await db.companySetting.create({
      data: {
        ...initialConfig.company,
      },
    });
  }
  return mapSettings(s);
}

export async function updateCompanySettings(
  updates: Partial<CompanySettings>,
): Promise<CompanySettings> {
  const current = await getCompanySettings();
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
      logoUrl: updates.logo_url,
      darkLogoUrl: updates.dark_logo_url,
      iconUrl: updates.icon_url,
      stampUrl: updates.stamp_url,
      signatureUrl: updates.signature_url,
      paymentTermsDays: updates.payment_terms_days,
      invoicePrefix: updates.invoice_prefix,
      invoiceNextNumber: updates.invoice_next_number,
      receiptPrefix: updates.receipt_prefix,
      receiptNextNumber: updates.receipt_next_number,
    },
  });
  return mapSettings(updated);
}
