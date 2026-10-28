import { withCommonCopy } from "@platform/locales/common";
import ar from "@platform/locales/admin/ar";
import type { AdminTranslationKeys } from "@platform/locales";
import { withAdminActivity } from "@platform/locales/admin-activity";

export type { Locale as AdminLocale } from "@platform/locales/registry";
import type { Locale as AdminLocale } from "@platform/locales/registry";
import { deepMerge } from "@platform/locales/merge";
export type AdminTranslations = AdminTranslationKeys;
export type Translations = AdminTranslations;

export const DEFAULT_ADMIN_LOCALE: AdminLocale = "ar";

/** Default dictionary, bundled with the client. */
export const defaultAdminTranslations: AdminTranslations = ar;

/** The default dictionary with the company's activity wording on top. */
export function defaultTranslationsFor(
  activity: string | null | undefined,
): AdminTranslations {
  return withAdminActivity(ar, "ar", activity);
}

/** Loads a dictionary on demand so the client only ships the languages actually used. */
export async function loadAdminTranslations(
  locale: AdminLocale,
  activity?: string | null,
): Promise<AdminTranslations> {
  const dictionary = locale === "ar" ? ar : (await import("@platform/locales/admin/en")).default;
  if (locale === "ar" || locale === "en") return withAdminActivity(dictionary, locale, activity);
  const { additionalTranslations, getCommonTranslations } = await import("@platform/locales/additional");
  const base = withCommonCopy(deepMerge(dictionary, additionalTranslations[locale]?.admin as never), "admin", getCommonTranslations(locale));
  return withAdminActivity(base, "en", activity);
}
