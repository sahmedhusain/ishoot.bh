import arLocale from "../locales/ar.json";
import enLocale from "../locales/en.json";
import type { AdminLocale, AdminTranslations } from "./translations";

export const adminTranslations: Record<AdminLocale, AdminTranslations> = {
  ar: arLocale.admin,
  en: enLocale.admin,
};
