
import currencyReference from "@platform/contracts/catalog/currencies.json";

export const CURRENCY_CODES: readonly string[] = (currencyReference as Array<{ code: string }>)
  .map(({ code }) => code)
  .filter((code) => !["XTS", "XXX"].includes(code));

export const isCurrencyCode = (code: unknown): code is string =>
  typeof code === "string" && CURRENCY_CODES.includes(code);

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BHD: "BHD",
  KWD: "KD",
  QAR: "QR",
  SAR: "\u20C1",
  AED: "\u20C3",
  OMR: "\u20C4",
  USD: "$",
  CAD: "$",
  AUD: "$",
  NZD: "$",
  SGD: "$",
  HKD: "$",
  MXN: "$",
  ARS: "$",
  CLP: "$",
  COP: "$",
  TWD: "$",
  BBD: "$",
  BZD: "$",
  BMD: "$",
  BSD: "$",
  FJD: "$",
  GYD: "$",
  JMD: "$",
  KYD: "$",
  LRD: "$",
  NAD: "$",
  SBD: "$",
  SRD: "$",
  TTD: "$",
  XCD: "$",
  ZWL: "$",
  EUR: "€",
  GBP: "£",
  EGP: "£",
  FKP: "£",
  GIP: "£",
  SHP: "£",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  RUB: "₽",
  KRW: "₩",
  KPW: "₩",
  TRY: "₺",
  UAH: "₴",
  ILS: "₪",
  VND: "₫",
  THB: "฿",
  PHP: "₱",
  NGN: "₦",
  CRC: "₡",
  PYG: "₲",
  LAK: "₭",
  MNT: "₮",
  GHS: "₵",
  KZT: "₸",
  GEL: "₾",
  AZN: "₼",
  AMD: "֏",
  IRR: "﷼",
  AFN: "؋",
  BDT: "৳",
  KHR: "៛",
  LKR: "₨",
  NPR: "₨",
  PKR: "₨",
  MUR: "₨",
  SCR: "₨",
  MVR: "\u20C2",
  BTC: "₿",
  AWG: "ƒ",
  ANG: "ƒ",
  XCG: "ƒ",
  KGS: "\u20C0",
  BRL: "R$",
  CHF: "CHF",
  ZAR: "ZAR",
};

export function getCurrencySymbol(code: string, unicode = true): string {
  const normalized = (code || "").trim().toUpperCase();
  if (!unicode && ["KGS", "MVR"].includes(normalized)) return normalized;
  if (!unicode && normalized === "OMR") return "RO";
  if (!unicode && normalized === "SAR") return "SAR";
  if (!unicode && normalized === "AED") return "AED";
  return CURRENCY_SYMBOLS[normalized] || normalized;
}

export const ARABIC_CURRENCY_LABELS: Record<string, string> = {
  BHD: "د.ب",
  KWD: "د.ك",
  QAR: "ر.ق",
  SAR: "ر.س",
  AED: "د.إ",
  OMR: "ر.ع",
  EGP: "ج.م",
  JOD: "د.أ",
};

export function getCurrencyLabel(code: string, isArabic = false, unicode = true): string {
  const normalized = (code || "").trim().toUpperCase();
  const symbol = getCurrencySymbol(normalized, unicode);
  return isArabic && /[A-Za-z]/.test(symbol) && ARABIC_CURRENCY_LABELS[normalized]
    ? ARABIC_CURRENCY_LABELS[normalized]
    : symbol;
}

export function getCurrencyDecimals(code: string): number {
  const reference = (currencyReference as Array<{ code: string; minorUnits?: number | null }>).find(
    (item) => item.code === (code || "").trim().toUpperCase()
  );
  if (reference?.minorUnits != null) return reference.minorUnits;
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: (code || "").trim().toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(Number(amount) * Math.pow(10, getCurrencyDecimals(currency)));
}
