import en from "./en";
import ar from "./ar";
import serverErrors from "./server-errors.json";

export { default as en } from "./en";
export { default as ar } from "./ar";
export type { ItTranslations } from "./en";
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

export function getNestedTranslation(obj: any, path: string): string {
  if (!obj || !path) return "";
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return path;
    }
  }
  return current !== undefined ? current : path;
}
