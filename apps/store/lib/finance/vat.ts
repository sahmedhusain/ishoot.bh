import { db } from "../atomic";
import type { DocumentTaxLine } from "../types";

export async function companyVat(
  client: any = db,
): Promise<{ vatEnabled: boolean; vatPercentage: number }> {
  try {
    const { getCompanySettings } = await import("../queries/company-settings");
    const settings = await getCompanySettings();
    const vatEnabled = Boolean(settings.vat_enabled);
    return {
      vatEnabled,
      vatPercentage: vatEnabled ? Number(settings.vat_percentage ?? 0) : 0,
    };
  } catch {
    return {
      vatEnabled: false,
      vatPercentage: 0,
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
