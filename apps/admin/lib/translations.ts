import { ar, en } from "@ishoot/locales";

export type AdminLocale = "ar" | "en";

export const adminTranslations = {
  ar: ar.admin,
  en: en.admin,
};

export type AdminTranslations = typeof en.admin;
export type Translations = AdminTranslations;

