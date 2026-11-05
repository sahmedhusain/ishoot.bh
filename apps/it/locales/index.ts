import en from "./en.json";
import ar from "./ar.json";
import serverErrors from "./server-errors.json";

export { en, ar };
export type ItTranslations = typeof en;
export { formatMessage, type MessageValues } from "./format-message";

export type Locale = "en" | "ar";
export const LANGUAGES: readonly { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
];

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}

export const serverMessages = serverErrors.messages;
export const serverTemplates = serverErrors.templates;

const translations: Record<Locale, typeof en> = { en, ar };

export function getTranslations(locale: Locale = "en"): typeof en {
  return translations[locale] ?? en;
}
