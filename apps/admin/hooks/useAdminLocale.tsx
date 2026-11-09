"use client";

import * as React from "react";
import { isLocale, isRtlLocale } from "@platform/locales/registry";
import { CurrencyLocaleProvider, StatusLabelsProvider } from "@platform/ui";
import {
  type AdminLocale,
  type AdminTranslations,
  DEFAULT_ADMIN_LOCALE,
  defaultAdminTranslations,
  defaultTranslationsFor,
  loadAdminTranslations,
} from "../lib/translations";

const STORAGE_KEY = "platform_admin_locale";

interface AdminLocaleContextType {
  locale: AdminLocale;
  isRTL: boolean;
  isArabic: boolean;
  setLocale: (locale: AdminLocale) => void;
  t: AdminTranslations;
}

const AdminLocaleContext = React.createContext<
  AdminLocaleContextType | undefined
>(undefined);

export function AdminLocaleProvider({
  children,
  activity,
  initialLocale = DEFAULT_ADMIN_LOCALE,
  initialTranslations,
}: {
  children: React.ReactNode;
  initialLocale?: AdminLocale;
  initialTranslations?: AdminTranslations;
  activity?: string | null;
}) {
  const [state, setState] = React.useState<{ locale: AdminLocale; t: AdminTranslations }>(() => ({
    locale: initialLocale,
    t: initialTranslations ?? defaultTranslationsFor(activity),
  }));

  const localeRequest = React.useRef(0);
  const applyLocale = React.useCallback(async (next: AdminLocale) => {
    if (!isLocale(next)) return;
    const request = ++localeRequest.current;
    const dictionary = await loadAdminTranslations(next, activity);
    if (request !== localeRequest.current) return;
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setState({ locale: next, t: dictionary });
    document.documentElement.dir = isRtlLocale(next) ? "rtl" : "ltr";
    document.documentElement.lang = next;
  }, [activity]);

  React.useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
    void applyLocale(isLocale(saved) ? saved : initialLocale);
  }, [applyLocale, initialLocale]);

  const setLocale = (newLocale: AdminLocale) => {
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch {}
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(newLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    void applyLocale(newLocale);
  };

  const { locale, t } = state;
  const isRTL = isRtlLocale(locale);

  return (
    <AdminLocaleContext.Provider value={{ locale, isRTL, isArabic: locale === "ar", setLocale, t }}>
      <CurrencyLocaleProvider value={locale}>
        <StatusLabelsProvider value={t.statusLabels ?? {}}>{children}</StatusLabelsProvider>
      </CurrencyLocaleProvider>
    </AdminLocaleContext.Provider>
  );
}

export function useAdminLocale() {
  const context = React.useContext(AdminLocaleContext);
  if (!context) {
    return {
      locale: DEFAULT_ADMIN_LOCALE,
      isRTL: DEFAULT_ADMIN_LOCALE === "ar",
      isArabic: DEFAULT_ADMIN_LOCALE === "ar",
      setLocale: () => { },
      t: defaultAdminTranslations,
    };
  }
  return context;
}
