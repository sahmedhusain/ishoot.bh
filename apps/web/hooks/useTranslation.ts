"use client";
import { deepMerge } from "@platform/locales/merge";

import * as React from "react";
import { useLocale } from "./useLocale";
import {
  getWebsiteTranslations,
  getNestedTranslation,
  formatMessage,
  type MessageValues,
} from "@platform/locales";
import { useSite } from "../components/site/SiteProvider";
import { siteCopyOverrides } from "../lib/site-copy";

/** Website copy for the current language, worded for the company's activity and catalogue. */
export function useTranslation() {
  const { locale, isRTL } = useLocale();
  const site = useSite();
  const translations = React.useMemo(
    () =>
      getWebsiteTranslations(
        locale,
        site?.activity,
        site ? deepMerge(siteCopyOverrides(site, locale), site.interfaceCopy?.[locale] as never) : undefined,
      ),
    [locale, site],
  );

  function t(path: string, values?: MessageValues): string {
    const template = getNestedTranslation(translations, path);
    return values ? formatMessage(template, values) : template;
  }

  return { t, locale, isRTL, isArabic: locale === "ar", translations, site };
}
