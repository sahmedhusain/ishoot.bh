"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_SYMBOLS = void 0;
exports.getCurrencySymbol = getCurrencySymbol;
exports.getCurrencyDecimals = getCurrencyDecimals;
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
function getCurrencyDecimals(code) {
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
