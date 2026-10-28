"use client";

import { isRtlLocale } from "@platform/locales/registry";
import { useParams } from "next/navigation";
import { Locale, defaultLocale, isValidLocale } from "../lib/i18n";

export function useLocale(): { locale: Locale; isRTL: boolean } {
  const params = useParams();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const isRTL = isRtlLocale(locale);

  return { locale, isRTL };
}
