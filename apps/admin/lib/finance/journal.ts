import { getCurrencyDecimals } from "@platform/config/currency";
export interface JournalPostingLine {
  accountId: string;
  debit: string;
  credit: string;
  memo?: string;
}
export function journalMinorUnits(value: string, currency: string): bigint {
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(value))
    throw new Error("Invalid journal amount");
  const decimals = getCurrencyDecimals(currency);
  const [whole, fraction = ""] = value.split(".");
  if (fraction.slice(decimals).replace(/0/g, ""))
    throw new Error("Journal amount exceeds currency precision");
  return (
    BigInt(whole) * BigInt(10 ** decimals) +
    BigInt(fraction.slice(0, decimals).padEnd(decimals, "0") || "0")
  );
}
export function validateJournalLines(
  lines: JournalPostingLine[],
  currency: string,
) {
  if (lines.length < 2 || lines.length > 500)
    throw new Error("A journal requires between 2 and 500 lines");
  let debits = BigInt(0),
    credits = BigInt(0);
  for (const line of lines) {
    if (!line.accountId || (line.memo?.length ?? 0) > 500)
      throw new Error("Invalid journal line");
    const debit = journalMinorUnits(line.debit, currency),
      credit = journalMinorUnits(line.credit, currency);
    if (debit > BigInt(0) === credit > BigInt(0))
      throw new Error("A journal line must have exactly one positive side");
    debits += debit;
    credits += credit;
  }
  if (debits !== credits)
    throw new Error("Journal debits and credits must balance");
  return { debitMinor: debits, creditMinor: credits };
}
export function expectedDrawerCash(
  input: {
    opening: string;
    receipts: string;
    change: string;
    refunds: string;
    cashIn: string;
    cashOut: string;
    drops: string;
  },
  currency: string,
) {
  const value = (key: keyof typeof input) =>
    journalMinorUnits(input[key], currency);
  return (
    value("opening") +
    value("receipts") +
    value("cashIn") -
    value("change") -
    value("refunds") -
    value("cashOut") -
    value("drops")
  );
}
