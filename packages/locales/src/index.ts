import enBase from "./en.json";
import arBase from "./ar.json";
import adminEn from "./admin/en.json";
import adminAr from "./admin/ar.json";
import websiteActivities from "./website-activities.json";
import { deepMerge, type DeepPartial } from "./merge";
import { withAdminActivity } from "./admin-activity";
export { formatMessage, type MessageValues } from "./format-message";
export { adminActivityCopy, withAdminActivity, type AdminCopyOverlay } from "./admin-activity";
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

/** Website wording an activity changes; the base dictionary is the media wording. */
export type WebsiteCopyOverlay = DeepPartial<TranslationKeys>;

const activityCopy = websiteActivities as unknown as Record<string, Partial<Record<Locale, WebsiteCopyOverlay>>>;


/** The wording an activity layers over the base website copy ("media" uses the base as it is). */
export function websiteActivityCopy(locale: Locale, activity: string | null | undefined): WebsiteCopyOverlay {
  if (!activity || activity === "media" || !activityCopy[activity]) return {};
  return deepMerge({} as WebsiteCopyOverlay, activityCopy._common?.[locale] as never, activityCopy[activity]?.[locale] as never);
}

/** Website translations for a company's activity, with the company's own wording (from the website editor) on top. */
export function getWebsiteTranslations(locale: Locale, activity?: string | null, overrides?: WebsiteCopyOverlay): TranslationKeys {
  return deepMerge(getTranslations(locale), websiteActivityCopy(locale, activity) as never, overrides as never);
}

/** Admin translations with the company's activity wording on top. */
export function getAdminTranslations(locale: Locale, activity?: string | null): AdminTranslationKeys {
  return withAdminActivity(getTranslations(locale).admin, locale, activity);
}
