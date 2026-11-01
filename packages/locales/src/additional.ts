import { commonEn, commonAr } from "./common.cjs";
import { isLocale, type Locale } from "./registry";
import enUi from "./ui/en";
import arUi from "./ui/ar";

export const additionalTranslations: Record<string, Record<string, unknown>> = {};

function copyLocale(locale: string): Locale {
  const tag = locale.toLowerCase().replace(/_/g, "-");
  if (isLocale(tag)) return tag;
  const language = tag.split("-")[0];
  return isLocale(language) ? language : "en";
}

export function getCommonTranslations(locale: string): typeof commonEn {
  const code = copyLocale(locale);
  return code === "ar" ? commonAr : commonEn;
}

export function getUiTranslations(locale: string): typeof enUi {
  const code = copyLocale(locale);
  return code === "ar" ? arUi : enUi;
}
