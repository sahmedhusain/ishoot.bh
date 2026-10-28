"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_SYMBOLS = void 0;
// ISO 4217 active currencies and funds; source: SIX list-one.xml, 2026-10-28.
const currencyReference = require("./currencies.json");
exports.CURRENCY_CODES = currencyReference.map(({ code }) => code).filter((code) => !["XTS", "XXX"].includes(code));
exports.isCurrencyCode = (code) => typeof code === "string" && exports.CURRENCY_CODES.includes(code);
exports.getCurrencySymbol = getCurrencySymbol;
exports.getCurrencyDecimals = getCurrencyDecimals;
exports.getCurrencyLabel = getCurrencyLabel;
exports.CURRENCY_SYMBOLS = {
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
function getCurrencySymbol(code, unicode = true) {
  const normalized = code.trim().toUpperCase();
  if (!unicode && ["KGS", "MVR"].includes(normalized)) return normalized;
  if (!unicode && normalized === "OMR") return "RO";
  if (!unicode && normalized === "SAR") return "SAR";
  if (!unicode && normalized === "AED") return "AED";
  return exports.CURRENCY_SYMBOLS[normalized] || normalized;
}
/** Arabic abbreviations used on Arabic screens and documents; other currencies keep their symbol. */
exports.ARABIC_CURRENCY_LABELS = { BHD: "د.ب", KWD: "د.ك", QAR: "ر.ق", SAR: "ر.س", AED: "د.إ", OMR: "ر.ع", EGP: "ج.م", JOD: "د.أ" };
/** The currency's symbol; on Arabic screens a Latin abbreviation (BHD, KD, SAR…) becomes its Arabic one. Official signs stay. */
function getCurrencyLabel(code, isArabic = false, unicode = true) {
  const normalized = (code || "").trim().toUpperCase();
  const symbol = getCurrencySymbol(normalized, unicode);
  return isArabic && /[A-Za-z]/.test(symbol) && exports.ARABIC_CURRENCY_LABELS[normalized] ? exports.ARABIC_CURRENCY_LABELS[normalized] : symbol;
}
function getCurrencyDecimals(code) {
  const reference = currencyReference.find((item) => item.code === code.trim().toUpperCase());
  if (reference?.minorUnits != null) return reference.minorUnits;
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: code.trim().toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}
