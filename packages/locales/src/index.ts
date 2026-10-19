import enBase from "./en.json";
import arBase from "./ar.json";
import adminEn from "./admin/en.json";
import adminAr from "./admin/ar.json";
export { formatMessage, type MessageValues } from "./format-message";
/** Canonical server messages; clients render their localized equivalents through the error catalog. */
export const serverMessages = adminEn.serverErrors.messages;
export const serverTemplates = adminEn.serverErrors.templates;

export type Locale = "en" | "ar";

// The admin dictionary lives in its own files so the admin client can load it without the website copy.
const en = { ...enBase, admin: adminEn };
const ar: typeof en = { ...arBase, admin: adminAr };

export type TranslationKeys = typeof en;
export type AdminTranslationKeys = typeof adminEn;

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] || translations.en;
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

export { en, ar };
