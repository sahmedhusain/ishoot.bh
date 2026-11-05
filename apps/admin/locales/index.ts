export { getCommonTranslations, getUiTranslations } from "./additional";
import { type Locale } from "./registry";
export { LANGUAGES, isLocale, isRtlLocale, type Locale } from "./registry";
import en from "./en.json";
import ar from "./ar.json";
import { withAdminActivity } from "./admin-activity";
export { formatMessage, type MessageValues } from "./format-message";
export {
  adminActivityCopy,
  withAdminActivity,
  type AdminCopyOverlay,
} from "./admin-activity";

/** Canonical server messages; clients render their localized equivalents through the error catalog. */
export const serverMessages = en.admin.serverErrors.messages;
export const serverTemplates = en.admin.serverErrors.templates;

export type TranslationKeys = typeof en;
export type AdminTranslationKeys = typeof en.admin;

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return (translations as Record<string, TranslationKeys>)[locale] ?? en;
}

/** Admin translations with the company's activity wording on top. */
export function getAdminTranslations(
  locale: Locale,
  activity?: string | null,
): AdminTranslationKeys {
  return withAdminActivity(
    getTranslations(locale).admin,
    locale === "ar" ? "ar" : "en",
    activity,
  );
}

export function getWebsiteTranslations(
  locale: Locale,
): AdminTranslationKeys["websiteCopyDefaults"] {
  return getTranslations(locale).admin.websiteCopyDefaults;
}
