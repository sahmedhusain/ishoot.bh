import arLocale from "../locales/ar.json";
import type { AdminTranslationKeys } from "@platform/locales";
import { withAdminActivity } from "@platform/locales/admin-activity";

export type { Locale as AdminLocale } from "@platform/locales/registry";
import type { Locale as AdminLocale } from "@platform/locales/registry";
export type AdminTranslations = AdminTranslationKeys;
export type Translations = AdminTranslations;

export const DEFAULT_ADMIN_LOCALE: AdminLocale = "ar";

export const defaultAdminTranslations: AdminTranslations = arLocale.admin;

export function defaultTranslationsFor(
  activity: string | null | undefined,
): AdminTranslations {
  return withAdminActivity(arLocale.admin, "ar", activity);
}

export async function loadAdminTranslations(
  locale: AdminLocale,
  activity?: string | null,
): Promise<AdminTranslations> {
  const dictionary =
    locale === "ar"
      ? arLocale.admin
      : (await import("../locales/en.json")).default.admin;
  return withAdminActivity(dictionary, locale === "ar" ? "ar" : "en", activity);
}
