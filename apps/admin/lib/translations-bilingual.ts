import arLocale from "../locales/ar.json";
import enLocale from "../locales/en.json";
import type { AdminLocale, AdminTranslations } from "./translations";

/** Both dictionaries, for bilingual documents (invoices, receipts, PDFs) and server metadata only. */
export const adminTranslations: Record<AdminLocale, AdminTranslations> = {
  ar: arLocale.admin,
  en: enLocale.admin,
};
