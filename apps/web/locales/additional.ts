import { isLocale, type Locale } from "./registry";
import en from "./en.json";
import ar from "./ar.json";

function copyLocale(locale: string): Locale {
  const tag = locale.toLowerCase().replace(/_/g, "-");
  if (isLocale(tag)) return tag;
  const language = tag.split("-")[0];
  return isLocale(language) ? language : "en";
}

export function getCommonTranslations(locale: string): typeof en.shared.common {
  const code = copyLocale(locale);
  return code === "ar" ? ar.shared.common : en.shared.common;
}

export function getUiTranslations(locale: string): typeof en.shared.ui {
  const code = copyLocale(locale);
  return code === "ar" ? ar.shared.ui : en.shared.ui;
}
