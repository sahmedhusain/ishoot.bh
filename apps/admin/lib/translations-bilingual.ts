import { withCommonCopy } from "@platform/locales/common";
import { LANGUAGES } from "@platform/locales/registry";
import { additionalTranslations, getCommonTranslations } from "@platform/locales/additional";
import { deepMerge } from "@platform/locales/merge";
import ar from "@platform/locales/admin/ar";
import en from "@platform/locales/admin/en";
import type { AdminLocale, AdminTranslations } from "./translations";

/** Both dictionaries, for bilingual documents (invoices, receipts, PDFs) and server metadata only. */
export const adminTranslations = Object.fromEntries(LANGUAGES.map(({ code }) => [code, code === "ar" ? ar : withCommonCopy(deepMerge(en, additionalTranslations[code]?.admin as never), "admin", getCommonTranslations(code))])) as Record<AdminLocale, AdminTranslations>;
