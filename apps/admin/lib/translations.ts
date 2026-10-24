import ar from "@platform/locales/admin/ar";
import type { AdminTranslationKeys } from "@platform/locales";
import { withAdminActivity } from "@platform/locales/admin-activity";

export type AdminLocale = "ar" | "en";
export type AdminTranslations = AdminTranslationKeys;
export type Translations = AdminTranslations;

export const DEFAULT_ADMIN_LOCALE: AdminLocale = "ar";

/** Default dictionary, bundled with the client. */
export const defaultAdminTranslations: AdminTranslations = ar;

/** The default dictionary with the company's activity wording on top. */
export function defaultTranslationsFor(activity: string | null | undefined): AdminTranslations {
  return withAdminActivity(ar, DEFAULT_ADMIN_LOCALE, activity);
}

/** Loads a dictionary on demand so the client only ships the languages actually used. */
export async function loadAdminTranslations(locale: AdminLocale, activity?: string | null): Promise<AdminTranslations> {
  const dictionary = locale === "ar" ? ar : (await import("@platform/locales/admin/en")).default;
  return withAdminActivity(dictionary, locale, activity);
}
