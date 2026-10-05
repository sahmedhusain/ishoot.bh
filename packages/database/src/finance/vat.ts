import { db } from "../db";

/**
 * The only source of a document's VAT: the company registration. When VAT is enabled every invoice
 * and quotation carries it at the company rate; when it is disabled none does. Forms cannot override it.
 */
export async function companyVat(client: Pick<typeof db, "companySetting"> = db): Promise<{ vatEnabled: boolean; vatPercentage: number }> {
  const company = await client.companySetting.findFirst({ select: { vatEnabled: true, vatPercentage: true } });
  const vatEnabled = company?.vatEnabled ?? false;
  return { vatEnabled, vatPercentage: vatEnabled ? Number(company?.vatPercentage ?? 10) : 0 };
}
