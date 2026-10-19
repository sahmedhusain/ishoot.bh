"use client";

import * as React from "react";
import { CurrencyLocaleProvider, StatusLabelsProvider } from "@platform/ui";
import {
  type AdminLocale,
  type AdminTranslations,
  DEFAULT_ADMIN_LOCALE,
  defaultAdminTranslations,
  loadAdminTranslations,
} from "../lib/translations";

const STORAGE_KEY = "platform_admin_locale";

interface AdminLocaleContextType {
  locale: AdminLocale;
  isRTL: boolean;
  setLocale: (locale: AdminLocale) => void;
  t: AdminTranslations;
}

const AdminLocaleContext = React.createContext<
  AdminLocaleContextType | undefined
>(undefined);

export function AdminLocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<{ locale: AdminLocale; t: AdminTranslations }>({
    locale: DEFAULT_ADMIN_LOCALE,
    t: defaultAdminTranslations,
  });

  const applyLocale = React.useCallback(async (next: AdminLocale) => {
    const dictionary = await loadAdminTranslations(next);
    setState({ locale: next, t: dictionary });
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  }, []);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    void applyLocale(saved === "en" || saved === "ar" ? saved : DEFAULT_ADMIN_LOCALE);
  }, [applyLocale]);

  const setLocale = (newLocale: AdminLocale) => {
    localStorage.setItem(STORAGE_KEY, newLocale);
    void applyLocale(newLocale);
  };

  const { locale, t } = state;
  const isRTL = locale === "ar";

  return (
    <AdminLocaleContext.Provider value={{ locale, isRTL, setLocale, t }}>
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
      setLocale: () => { },
      t: defaultAdminTranslations,
    };
  }
  return context;
}
