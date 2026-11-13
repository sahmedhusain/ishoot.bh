"use client";
import { deepMerge } from "@platform/locales/merge";

import * as React from "react";
import { useLocale } from "./useLocale";
import {
  getWebsiteTranslations,
  getNestedTranslation,
  formatMessage,
  type MessageValues,
} from "../locales";
import { useSite } from "../components/site/SiteProvider";
import { siteCopyOverrides } from "../lib/site-copy";

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

  const defaultValues: MessageValues = React.useMemo(() => {
    const name = site ? (locale === "ar" ? (site.companyNameAr || site.companyNameEn) : (site.companyNameEn || site.companyNameAr)) : "";
    return {
      companyName: name || "",
      year: new Date().getFullYear(),
      currency: site?.currency || "USD",
    };
  }, [site, locale]);

  function t(path: string, values?: MessageValues & { defaultValue?: string }): string {
    const template = getNestedTranslation(translations, path);
    const isUnresolved = !template || typeof template !== "string" || template === path;
    if (isUnresolved) {
      if (values?.defaultValue) return values.defaultValue as string;
      if (typeof template === "string") return template;
      return path;
    }
    const merged = values ? { ...defaultValues, ...values } : defaultValues;
    if (values || /\{[A-Za-z0-9_]+\}/.test(template)) {
      try {
        return formatMessage(template, merged);
      } catch {
        return template;
      }
    }
    return template;
  }

  return { t, locale, isRTL, isArabic: locale === "ar", translations, site };
}
