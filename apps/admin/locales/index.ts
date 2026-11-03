import { commonEn, commonAr, withCommonCopy } from "./common.cjs";
export { getCommonTranslations, getUiTranslations } from "./additional";
import { getCommonTranslations } from "./additional";
import { type Locale } from "./registry";
export { LANGUAGES, isLocale, isRtlLocale, type Locale } from "./registry";
import adminEn from "./admin/en";
import adminAr from "./admin/ar";
import adminActivities from "./admin-activities.json";
import enExtras from "./en.json";
import arExtras from "./ar.json";
import { deepMerge, type DeepPartial } from "./merge";
import { withAdminActivity } from "./admin-activity";
export { formatMessage, type MessageValues } from "./format-message";
export {
  adminActivityCopy,
  withAdminActivity,
  type AdminCopyOverlay,
} from "./admin-activity";

/** Canonical server messages; clients render their localized equivalents through the error catalog. */
export const serverMessages = adminEn.serverErrors.messages;
export const serverTemplates = adminEn.serverErrors.templates;

const en = { common: commonEn, admin: adminEn, ...enExtras };
const ar: typeof en = { common: commonAr, admin: adminAr, ...arExtras };

export type TranslationKeys = typeof en;
export type AdminTranslationKeys = typeof adminEn;

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return (translations as Record<string, TranslationKeys>)[locale] ?? en;
}

/** Admin translations with the company's activity wording on top. */
export function getAdminTranslations(
  locale: Locale,
  activity?: string | null,
): AdminTranslationKeys {
  const common = getCommonTranslations(locale);
  const base = withAdminActivity(getTranslations(locale).admin, locale === "ar" ? "ar" : "en", activity);
  return withCommonCopy(base, "admin", common);
}

const defaultWebsitePlaceholders: Record<string, Record<string, string>> = {
  nav: { home: "Home", about: "About", works: "Catalogue", contact: "Contact" },
  hero: { headline: "Headline", subheadline: "Intro", caption: "Caption", exploreWorks: "Explore", startProject: "Get in touch" },
  contact: { title: "Contact Us", subtitle: "We would love to hear from you", submit: "Send message" },
  portfolio: { title: "Portfolio", subtitle: "Our latest work" },
};

export function getWebsiteTranslations(locale: Locale, activity?: string | null): any {
  return defaultWebsitePlaceholders;
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
