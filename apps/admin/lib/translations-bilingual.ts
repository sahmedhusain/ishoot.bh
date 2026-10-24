import ar from "@platform/locales/admin/ar";
import en from "@platform/locales/admin/en";
import type { AdminLocale, AdminTranslations } from "./translations";

/** Both dictionaries, for bilingual documents (invoices, receipts, PDFs) and server metadata only. */
export const adminTranslations: Record<AdminLocale, AdminTranslations> = { ar, en };
