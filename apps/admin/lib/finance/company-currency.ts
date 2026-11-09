import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { assertSupportedCurrency } from "../constants/finance";

const DEFAULT_FALLBACK_CURRENCY = "USD";

export async function companyCurrency(): Promise<string> {
  try {
    const { getCompanySettings } = await import("../queries/company-settings");
    const settings = await getCompanySettings();
    if (settings?.default_currency) {
      assertSupportedCurrency(settings.default_currency);
      return settings.default_currency;
    }
  } catch {}
  return DEFAULT_FALLBACK_CURRENCY;
}

export async function assertCompanyCurrency(requested?: string, connection: Pick<typeof db, "$queryRaw"> = db): Promise<string> {
  let currency: string | undefined;
  try {
    const rows = await connection.$queryRaw<Array<{ defaultCurrency: string }>>`SELECT "defaultCurrency" FROM "CompanySetting" WHERE singleton = 1 FOR SHARE`;
    currency = rows?.[0]?.defaultCurrency;
  } catch {}
  if (!currency) {
    currency = await companyCurrency();
  }
  assertSupportedCurrency(currency);
  if (requested !== undefined && requested !== currency) throw new Error(serverMessages.companyCurrencyRequired);
  return currency;
}
