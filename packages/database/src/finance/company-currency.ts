import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { assertSupportedCurrency } from "../constants/finance";

export async function companyCurrency(): Promise<string> {
  const company = await db.companySetting.findUniqueOrThrow({ where: { singleton: 1 }, select: { defaultCurrency: true } });
  assertSupportedCurrency(company.defaultCurrency);
  return company.defaultCurrency;
}

/** Currency belongs to the company; a submitted document cannot select a different currency. */
export async function assertCompanyCurrency(requested?: string, connection: Pick<typeof db, "$queryRaw"> = db): Promise<string> {
  const rows = await connection.$queryRaw<Array<{ defaultCurrency: string }>>`SELECT "defaultCurrency" FROM "CompanySetting" WHERE singleton = 1 FOR SHARE`;
  const currency = rows[0]?.defaultCurrency;
  assertSupportedCurrency(currency);
  if (requested !== undefined && requested !== currency) throw new Error(serverMessages.companyCurrencyRequired);
  return currency;
}
