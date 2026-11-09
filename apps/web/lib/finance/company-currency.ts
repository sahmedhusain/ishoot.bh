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
  return "USD";
}

export async function assertCompanyCurrency(requested?: string, _connection?: any): Promise<string> {
  const currency = await companyCurrency();
  assertSupportedCurrency(currency);
  if (requested !== undefined && requested !== currency) throw new Error(serverMessages.companyCurrencyRequired);
  return currency;
}
