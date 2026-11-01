import { commonEn, commonAr, withCommonCopy } from "./common.cjs";
export { getCommonTranslations, getUiTranslations } from "./additional";
import { getCommonTranslations } from "./additional";
import { type Locale } from "./registry";
export { LANGUAGES, isLocale, isRtlLocale, type Locale } from "./registry";
import enBase from "./en.json";
import arBase from "./ar.json";
import adminEn from "./admin/en";
import adminAr from "./admin/ar";
import websiteActivities from "./website-activities.json";
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


// The admin dictionary lives in its own files so the admin client can load it without the website copy.
const en = { ...withCommonCopy(enBase, "web", commonEn), admin: adminEn };
const ar: typeof en = { ...withCommonCopy(arBase, "web", commonAr), admin: adminAr };

export type TranslationKeys = typeof en;
export type AdminTranslationKeys = typeof adminEn;

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return (translations as Record<string, TranslationKeys>)[locale] ?? en;
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

/** Website wording an activity changes; the base dictionary is activity-neutral. */
export type WebsiteCopyOverlay = DeepPartial<TranslationKeys>;

const activityCopy = websiteActivities as unknown as Record<
  string,
  Partial<Record<Locale, WebsiteCopyOverlay>>
>;

/** The wording an activity layers over the base website copy. */
export function websiteActivityCopy(
  locale: Locale,
  activity: string | null | undefined,
): WebsiteCopyOverlay {
  if (!activity || !activityCopy[activity]) return {};
  return deepMerge(
    {} as WebsiteCopyOverlay,
    activityCopy._common?.[locale === "ar" ? "ar" : "en"] as never,
    activityCopy[activity]?.[locale === "ar" ? "ar" : "en"] as never,
  );
}

/** Website translations for a company's activity, with the company's own wording (from the website editor) on top. */
export function getWebsiteTranslations(
  locale: Locale,
  activity?: string | null,
  overrides?: WebsiteCopyOverlay,
): TranslationKeys {
  return deepMerge(
    getTranslations(locale),
    websiteActivityCopy(locale, activity) as never,
    overrides as never,
  );
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
