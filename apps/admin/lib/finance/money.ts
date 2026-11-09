import { getCurrencyDecimals } from "@platform/config/currency";

export function moneyFactor(currency: string): number {
  return Math.pow(10, getCurrencyDecimals(currency));
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(Number(amount) * moneyFactor(currency));
}

export function roundMoney(amount: number, currency: string): number {
  return toMinorUnits(amount, currency) / moneyFactor(currency);
}

export function lineTotal(
  quantity: number,
  unitPrice: number,
  currency: string,
): number {
  return roundMoney(Number(quantity) * Number(unitPrice), currency);
}

export function sumMoney(
  amounts: Array<number | string | { toString(): string }>,
  currency: string,
): number {
  const minor = amounts.reduce<number>(
    (sum, value) => sum + toMinorUnits(Number(value), currency),
    0,
  );
  return minor / moneyFactor(currency);
}

export function amountDue(
  total: number,
  paid: number,
  currency: string,
): number {
  return (
    Math.max(0, toMinorUnits(total, currency) - toMinorUnits(paid, currency)) /
    moneyFactor(currency)
  );
}

export function isFullyPaid(
  total: number,
  paid: number,
  currency: string,
): boolean {
  return toMinorUnits(paid, currency) >= toMinorUnits(total, currency);
}

export function paymentStatusFor(
  total: number,
  paid: number,
  currency: string,
): "paid" | "partially_paid" | null {
  if (toMinorUnits(paid, currency) <= 0) return null;
  return isFullyPaid(total, paid, currency) ? "paid" : "partially_paid";
}

export function validMoneyAmount(amount: number, currency: string, allowZero = false): boolean {
  return Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0) && Number.isSafeInteger(toMinorUnits(amount, currency)) && (allowZero || toMinorUnits(amount, currency) > 0) && Math.abs(amount - roundMoney(amount, currency)) <= Number.EPSILON * Math.max(1, Math.abs(amount)) * 4;
}
