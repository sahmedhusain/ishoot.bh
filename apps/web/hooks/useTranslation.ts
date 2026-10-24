"use client";

import { useLocale } from "./useLocale";
import { getTranslations, getNestedTranslation, formatMessage, type MessageValues } from "@platform/locales";


export function useTranslation() {
  const { locale, isRTL } = useLocale();
  const translations = getTranslations(locale);

  function t(path: string, values?: MessageValues): string {
    const template = getNestedTranslation(translations, path);
    return values ? formatMessage(template, values) : template;
  }

  return { t, locale, isRTL, translations };
}
