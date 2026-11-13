import { isLocale, type Locale } from "./registry";
import en from "./en.json";
import ar from "./ar.json";

export const ADDITIONAL_LOCALE_CODES = [
  "af", "am", "az", "be", "bg", "bn", "bs", "ca",
  "cs", "cy", "da", "de", "el", "es", "et", "eu",
  "fa", "fi", "fil", "fr", "ga", "gl", "gu", "he",
  "hi", "hr", "hu", "hy", "id", "is", "it", "ja",
  "ka", "kk", "km", "kn", "ko", "ky", "lo", "lt",
  "lv", "mk", "ml", "mn", "mr", "ms", "my", "ne",
  "nl", "no", "pa", "pl", "pt", "ro", "ru", "si",
  "sk", "sl", "sq", "sr", "sv", "sw", "ta", "te",
  "th", "tr", "uk", "ur", "uz", "vi", "zh", "zu",
].slice(0, 64);

export const ALL_SUPPORTED_LOCALES = ["en", "ar", ...ADDITIONAL_LOCALE_CODES] as const;

const RTL_ADDITIONAL = new Set(["fa", "he", "ur"]);

function copyLocale(locale: string): Locale {
  const tag = locale.toLowerCase().replace(/_/g, "-");
  if (isLocale(tag)) return tag;
  const language = tag.split("-")[0];
  if (isLocale(language)) return language;
  if (RTL_ADDITIONAL.has(language)) return "ar";
  return "en";
}

export function getCommonTranslations(locale: string): typeof en.shared.common {
  const code = copyLocale(locale);
  return code === "ar" ? ar.shared.common : en.shared.common;
}

export function getUiTranslations(locale: string): typeof en.shared.ui {
  const code = copyLocale(locale);
  return code === "ar" ? ar.shared.ui : en.shared.ui;
}
