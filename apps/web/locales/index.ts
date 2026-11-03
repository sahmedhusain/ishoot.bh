import { commonEn, commonAr, withCommonCopy } from "./common.cjs";
export { getCommonTranslations, getUiTranslations } from "./additional";
import { type Locale } from "./registry";
export { LANGUAGES, isLocale, isRtlLocale, type Locale } from "./registry";
import enBase from "./en.json";
import arBase from "./ar.json";
import websiteActivities from "./website-activities.json";
import { deepMerge, type DeepPartial } from "./merge";
import serverErrors from "./server-errors.json";
export { formatMessage, type MessageValues } from "./format-message";

export const serverMessages = serverErrors.messages;
export const serverTemplates = serverErrors.templates;

const en = withCommonCopy(enBase, "web", commonEn);
const ar: typeof en = withCommonCopy(arBase, "web", commonAr);

export type TranslationKeys = typeof en;
export { en, ar };

export type WebsiteCopyOverlay = DeepPartial<TranslationKeys>;

const activityCopy = websiteActivities as unknown as Record<
  string,
  Partial<Record<Locale, WebsiteCopyOverlay>>
>;

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

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return (translations as Record<string, TranslationKeys>)[locale] ?? en;
}

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
