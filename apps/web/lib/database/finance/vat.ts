import { db } from "../db";
import type { DocumentTaxLine } from "../types";

/**
 * The only source of a document's VAT: the company registration. When VAT is enabled every invoice
 * and quotation carries it at the company rate; when it is disabled none does. Forms cannot override it.
 */
export async function companyVat(
  client: any = db,
): Promise<{ vatEnabled: boolean; vatPercentage: number }> {
  try {
    const { getCompanySettings } = await import("../queries/company-settings");
    const settings = await getCompanySettings();
    const vatEnabled = Boolean(settings.vat_enabled);
    return {
      vatEnabled,
      vatPercentage: vatEnabled ? Number(settings.vat_percentage ?? 10) : 0,
    };
  } catch {
    const company = await client.companySetting?.findFirst?.({
      select: { vatEnabled: true, vatPercentage: true },
    });
    const vatEnabled = company?.vatEnabled ?? false;
    return {
      vatEnabled,
      vatPercentage: vatEnabled ? Number(company?.vatPercentage ?? 10) : 0,
    };
  }
}

export interface ActiveTax {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  rate: number;
  registrationNumber: string | null;
}

/** Active taxes besides VAT that apply to new invoices or quotations, in display order. */
export async function companyTaxes(
  kind: "invoice" | "quotation",
  client: any = db,
): Promise<ActiveTax[]> {
  const rows =
    (await client.taxRate?.findMany?.({
      where: {
        isActive: true,
        ...(kind === "invoice"
          ? { appliesToInvoices: true }
          : { appliesToQuotations: true }),
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    })) || [];
  return rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    rate: Number(r.ratePercent),
    registrationNumber: r.registrationNumber,
  }));
}

/** DocumentTax rows for a calculated document: the frozen name, rate, registration and amount of each tax. */
export function documentTaxRows(
  taxes: ActiveTax[],
  amounts: Array<{ code: string; amount: number }>,
) {
  return taxes.map((tax, index) => ({
    taxRateId: tax.id || null,
    code: tax.code,
    nameEn: tax.nameEn,
    nameAr: tax.nameAr,
    ratePercent: tax.rate,
    registrationNumber: tax.registrationNumber,
    amount: amounts.find((a) => a.code === tax.code)?.amount ?? 0,
    displayOrder: index,
  }));
}

/** The taxes frozen on an issued document, in the shape used to recalculate it. */
export function frozenTaxes(
  rows: Array<{
    taxRateId: string | null;
    code: string;
    nameEn: string;
    nameAr: string;
    ratePercent: unknown;
    registrationNumber: string | null;
  }>,
): ActiveTax[] {
  return rows.map((r) => ({
    id: r.taxRateId ?? "",
    code: r.code,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    rate: Number(r.ratePercent),
    registrationNumber: r.registrationNumber,
  }));
}

/** Frozen tax rows → the shape documents and screens use. */
export function mapDocumentTaxLines(rows: unknown): DocumentTaxLine[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    code: r.code,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    rate: Number(r.ratePercent),
    registration_number: r.registrationNumber || undefined,
    amount: Number(r.amount),
  }));
}
