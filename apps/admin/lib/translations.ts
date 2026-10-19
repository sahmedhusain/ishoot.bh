import ar from "@platform/locales/admin/ar";
import type { AdminTranslationKeys } from "@platform/locales";

export type AdminLocale = "ar" | "en";
export type AdminTranslations = AdminTranslationKeys;
export type Translations = AdminTranslations;

export const DEFAULT_ADMIN_LOCALE: AdminLocale = "ar";

/** Default dictionary, bundled with the client. */
export const defaultAdminTranslations: AdminTranslations = ar;

/** Loads a dictionary on demand so the client only ships the languages actually used. */
export async function loadAdminTranslations(locale: AdminLocale): Promise<AdminTranslations> {
  if (locale === "ar") return ar;
  return (await import("@platform/locales/admin/en")).default;
}
