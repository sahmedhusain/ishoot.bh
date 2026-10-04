import ar from "@ishoot/locales/admin/ar";
import en from "@ishoot/locales/admin/en";
import type { AdminLocale, AdminTranslations } from "./translations";

/** Both dictionaries, for bilingual documents (invoices, receipts, PDFs) and server metadata only. */
export const adminTranslations: Record<AdminLocale, AdminTranslations> = { ar, en };
