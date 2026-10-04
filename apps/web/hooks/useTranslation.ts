"use client";

import { useLocale } from "./useLocale";
import {
getTranslations,
getNestedTranslation
} from "@ishoot/locales";

export function useTranslation() {
  const { locale, isRTL } = useLocale();
  const translations = getTranslations(locale);

  function t(path: string): string {
    return getNestedTranslation(translations, path);
  }

  return { t, locale, isRTL, translations };
}
