import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { assertSupportedCurrency } from "../constants/finance";

export async function companyCurrency(): Promise<string> {
  try {
    const { getCompanySettings } = await import("../queries/company-settings");
    const settings = await getCompanySettings();
    if (settings?.default_currency) {
      assertSupportedCurrency(settings.default_currency);
      return settings.default_currency;
    }
  } catch {}
  try {
    const company = await db.companySetting.findFirst({ select: { defaultCurrency: true } });
    if (company?.defaultCurrency) {
      assertSupportedCurrency(company.defaultCurrency);
      return company.defaultCurrency;
    }
  } catch {}
  return "BHD";
}

/** Currency belongs to the company; a submitted document cannot select a different currency. */
export async function assertCompanyCurrency(requested?: string, connection: Pick<typeof db, "$queryRaw"> = db): Promise<string> {
  let currency: string | undefined;
  try {
    const rows = await connection.$queryRaw<Array<{ defaultCurrency: string }>>`SELECT "defaultCurrency" FROM "CompanySetting" WHERE singleton = 1 FOR SHARE`;
    currency = rows?.[0]?.defaultCurrency;
  } catch {}
  if (!currency) {
    currency = await companyCurrency().catch(() => "BHD");
  }
  assertSupportedCurrency(currency);
  if (requested !== undefined && requested !== currency) throw new Error(serverMessages.companyCurrencyRequired);
  return currency;
}
