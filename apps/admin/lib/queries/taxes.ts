import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../atomic";
import { getCompanyConfiguration } from "../api/company";

/** A tax the company is registered for besides VAT, as the settings screen shows it. */
export interface TaxRateRecord {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  rate: number;
  registration_number?: string;
  certificate_url?: string;
  certificate_valid_until?: string;
  applies_to_invoices: boolean;
  applies_to_quotations: boolean;
  is_active: boolean;
  /** Invoices and quotations that carry this tax; a used tax can be deactivated but not deleted. */
  documents: number;
}

export interface TaxRateInput {
  id?: string;
  name_en: string;
  name_ar: string;
  rate: number;
  registration_number?: string;
  certificate_url?: string;
  certificate_valid_until?: string;
  applies_to_invoices: boolean;
  applies_to_quotations: boolean;
  is_active: boolean;
}

/** A certificate behind a QR code on a document: VAT (company settings) or a tax from the registry. */
export interface TaxCertificate {
  code: string;
  nameEn: string;
  nameAr: string;
  registrationNumber: string | null;
  certificateUrl: string | null;
  validUntil: string | null;
  active: boolean;
}

export const VAT_TAX_CODE = "vat";

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36) || "tax"
  );
}

export async function listTaxRates(): Promise<TaxRateRecord[]> {
  const rows =
    (await db.taxRate.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { documentTaxes: true } } },
    })) || [];
  return rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    rate: Number(r.ratePercent),
    registration_number: r.registrationNumber ?? undefined,
    certificate_url: r.certificateUrl ?? undefined,
    certificate_valid_until: r.certificateValidUntil
      ?.toISOString()
      .slice(0, 10),
    applies_to_invoices: r.appliesToInvoices,
    applies_to_quotations: r.appliesToQuotations,
    is_active: r.isActive,
    documents: r._count?.documentTaxes ?? 0,
  }));
}

/** Creates or updates a tax. The rate of a tax already on documents only affects new documents. */
export async function saveTaxRate(input: TaxRateInput) {
  const nameEn = input.name_en?.trim().slice(0, 80);
  const nameAr = input.name_ar?.trim().slice(0, 80);
  if (!nameEn || !nameAr)
    throw new Error(serverMessages.enterTheTaxNameInEnglish);
  if (/^(vat|value added tax)$/i.test(nameEn))
    throw new Error(serverMessages.vatIsSetUpInThe);
  const rate = Math.round(Number(input.rate) * 100) / 100;
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100)
    throw new Error(serverMessages.enterATaxRateBetween0);
  if (!input.applies_to_invoices && !input.applies_to_quotations)
    throw new Error(serverMessages.chooseWhereTheTaxAppliesInvoices);
  const validUntil = input.certificate_valid_until?.trim();
  if (validUntil && !Number.isFinite(Date.parse(validUntil)))
    throw new Error(serverMessages.invalidDate);
  const data = {
    nameEn,
    nameAr,
    ratePercent: rate,
    registrationNumber: input.registration_number?.trim().slice(0, 60) || null,
    certificateUrl: input.certificate_url?.trim() || null,
    certificateValidUntil: validUntil
      ? new Date(`${validUntil}T00:00:00Z`)
      : null,
    appliesToInvoices: !!input.applies_to_invoices,
    appliesToQuotations: !!input.applies_to_quotations,
    isActive: !!input.is_active,
  };
  return runAtomicMutation(async () => {
    if (input.id) {
      const existing = await db.taxRate.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!existing) throw new Error(serverMessages.taxNotFound);
      return db.taxRate.update({ where: { id: input.id }, data });
    }
    const base = slug(nameEn) === VAT_TAX_CODE ? "tax" : slug(nameEn);
    let code = base;
    for (
      let n = 2;
      await db.taxRate.findUnique({ where: { code }, select: { id: true } });
      n++
    )
      code = `${base}-${n}`;
    const order = await db.taxRate.count();
    return db.taxRate.create({ data: { ...data, code, displayOrder: order } });
  });
}

/** Removes a tax that no document uses; a used one is kept so issued documents stay intact. */
export async function deleteTaxRate(id: string) {
  return runAtomicMutation(async () => {
    const used = await db.documentTax.count({ where: { taxRateId: id } });
    if (used) throw new Error(serverMessages.thisTaxIsOnExistingDocuments);
    await db.taxRate.delete({ where: { id } });
  });
}

/** The certificate behind a document's QR code. */
export async function getTaxCertificate(
  code: string,
): Promise<TaxCertificate | null> {
  if (code === VAT_TAX_CODE) {
    const company = await getCompanyConfiguration().catch(() => null);
    if (!company?.vatId && !company?.vatCertificateUrl) return null;
    return {
      code,
      nameEn: "",
      nameAr: "",
      registrationNumber: company.vatId,
      certificateUrl: company.vatCertificateUrl,
      validUntil: null,
      active: company.vatEnabled,
    };
  }
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(code)) return null;
  const tax = await db.taxRate.findUnique({ where: { code } });
  if (!tax) return null;
  return {
    code,
    nameEn: tax.nameEn,
    nameAr: tax.nameAr,
    registrationNumber: tax.registrationNumber,
    certificateUrl: tax.certificateUrl,
    validUntil: tax.certificateValidUntil?.toISOString().slice(0, 10) ?? null,
    active: tax.isActive,
  };
}

/** Active taxes for the forms' live totals. */
export async function getActiveTaxSummary() {
  const rows =
    (await db.taxRate.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    })) || [];
  return rows.map((r: any) => ({
    code: r.code,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    rate: Number(r.ratePercent),
    invoices: r.appliesToInvoices,
    quotations: r.appliesToQuotations,
  }));
}
