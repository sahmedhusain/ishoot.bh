import { db } from '../db';
import { mockCompanySettings } from '../mock-data';
import { CompanySettings, SupportedCurrency } from '../types';

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const s = await db.companySetting.findFirst();
    if (s) {
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
        logo_url: s.logoUrl || '/logo.svg',
        payment_terms_days: s.paymentTermsDays,
        invoice_prefix: s.invoicePrefix,
        invoice_next_number: s.invoiceNextNumber,
        receipt_prefix: s.receiptPrefix,
        receipt_next_number: s.receiptNextNumber,
        updated_at: s.updatedAt.toISOString(),
      };
    }
  } catch (e) {
    console.error('Error fetching company settings from DB:', e);
  }
  return mockCompanySettings;
}

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
  try {
    const first = await db.companySetting.findFirst();
    if (first) {
      const updated = await db.companySetting.update({
        where: { id: first.id },
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
      return {
        id: updated.id,
        company_name_en: updated.companyNameEn,
        company_name_ar: updated.companyNameAr,
        cr_number: updated.crNumber || '',
        vat_id: updated.vatId || undefined,
        vat_enabled: updated.vatEnabled,
        vat_percentage: Number(updated.vatPercentage),
        default_currency: (updated.defaultCurrency as SupportedCurrency) || 'BHD',
        currency_decimals: updated.currencyDecimals,
        address_en: updated.addressEn || '',
        address_ar: updated.addressAr || '',
        phone: updated.phone || '',
        email: updated.email || '',
        website: updated.website || '',
        bank_name: updated.bankName || '',
        bank_iban: updated.bankIban || '',
        bank_account_number: updated.bankAccountNumber || '',
        bank_swift: updated.bankSwift || '',
        logo_url: updated.logoUrl || '/logo.svg',
        payment_terms_days: updated.paymentTermsDays,
        invoice_prefix: updated.invoicePrefix,
        invoice_next_number: updated.invoiceNextNumber,
        receipt_prefix: updated.receiptPrefix,
        receipt_next_number: updated.receiptNextNumber,
        updated_at: updated.updatedAt.toISOString(),
      };
    }
  } catch (e) {
    console.error('Error updating company settings in DB:', e);
  }
  Object.assign(mockCompanySettings, updates, { updated_at: new Date().toISOString() });
  return mockCompanySettings;
}
