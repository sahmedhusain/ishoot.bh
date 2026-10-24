import enBase from "./en.json";
import arBase from "./ar.json";
import adminEn from "./admin/en.json";
import adminAr from "./admin/ar.json";
import websiteActivities from "./website-activities.json";
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

type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
/** Website wording an activity changes; the base dictionary is the media wording. */
export type WebsiteCopyOverlay = DeepPartial<TranslationKeys>;

const activityCopy = websiteActivities as unknown as Record<string, Partial<Record<Locale, WebsiteCopyOverlay>>>;

function deepMerge<T>(base: T, ...layers: (DeepPartial<T> | undefined)[]): T {
  const out = { ...base } as Record<string, unknown>;
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined || value === "") continue;
      const current = out[key];
      out[key] =
        value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)
          ? deepMerge(current, value as never)
          : value;
    }
  }
  return out as T;
}

/** The wording an activity layers over the base website copy ("media" uses the base as it is). */
export function websiteActivityCopy(locale: Locale, activity: string | null | undefined): WebsiteCopyOverlay {
  if (!activity || activity === "media" || !activityCopy[activity]) return {};
  return deepMerge({} as WebsiteCopyOverlay, activityCopy._common?.[locale] as never, activityCopy[activity]?.[locale] as never);
}

/** Website translations for a company's activity, with the company's own wording (from the website editor) on top. */
export function getWebsiteTranslations(locale: Locale, activity?: string | null, overrides?: WebsiteCopyOverlay): TranslationKeys {
  return deepMerge(getTranslations(locale), websiteActivityCopy(locale, activity) as never, overrides as never);
}
