import { db } from '../db';
import { CompanySettings, SupportedCurrency } from '../types';

function mapSettings(s: any): CompanySettings {
  return {
    id: s.id,
    company_name_en: s.companyNameEn,
    company_name_ar: s.companyNameAr,
    cr_number: s.crNumber || '',
    vat_id: s.vatId || undefined,
    vat_enabled: s.vatEnabled,
    vat_percentage: Number(s.vatPercentage),
    default_currency: (s.defaultCurrency as SupportedCurrency) || 'BHD',
    currency_decimals: s.currencyDecimals,
    address_en: s.addressEn || '',
    address_ar: s.addressAr || '',
    phone: s.phone || '',
    email: s.email || '',
    website: s.website || '',
    bank_name: s.bankName || '',
    bank_iban: s.bankIban || '',
    bank_account_number: s.bankAccountNumber || '',
    bank_swift: s.bankSwift || '',
    logo_url: s.logoUrl || '/images/logo-color.svg',
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
        companyNameEn: 'ishoot Cinema Production S.P.C.',
        companyNameAr: 'دار آي شوت للإنتاج السينمائي ذ.م.م',
        crNumber: 'CR-142859-1',
        vatEnabled: false,
        vatPercentage: 10.00,
        defaultCurrency: 'BHD',
        currencyDecimals: 3,
      },
    });
  }
  return mapSettings(s);
}

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
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
      defaultCurrency: updates.default_currency,
      currencyDecimals: updates.currency_decimals,
      addressEn: updates.address_en,
      addressAr: updates.address_ar,
      phone: updates.phone,
      email: updates.email,
      website: updates.website,
      bankName: updates.bank_name,
      bankIban: updates.bank_iban,
      bankAccountNumber: updates.bank_account_number,
      bankSwift: updates.bank_swift,
      logoUrl: updates.logo_url,
      paymentTermsDays: updates.payment_terms_days,
      invoicePrefix: updates.invoice_prefix,
      invoiceNextNumber: updates.invoice_next_number,
      receiptPrefix: updates.receipt_prefix,
      receiptNextNumber: updates.receipt_next_number,
    },
  });
  return mapSettings(updated);
}
