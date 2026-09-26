'use client';

import * as React from 'react';
import { AdminLocale, adminTranslations } from '../lib/translations';

interface AdminLocaleContextType {
  locale: AdminLocale;
  isRTL: boolean;
  setLocale: (locale: AdminLocale) => void;
  t: typeof adminTranslations['ar'];
}

const AdminLocaleContext = React.createContext<AdminLocaleContextType | undefined>(undefined);

export function AdminLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<AdminLocale>('ar');

  React.useEffect(() => {
    const saved = localStorage.getItem('ishoot_admin_locale') as AdminLocale;
    if (saved === 'en' || saved === 'ar') {
      setLocaleState(saved);
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    } else {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    }
  }, []);

  const setLocale = (newLocale: AdminLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('ishoot_admin_locale', newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  };

  const isRTL = locale === 'ar';
  const t = adminTranslations[locale];

  return (
    <AdminLocaleContext.Provider value={{ locale, isRTL, setLocale, t }}>
      {children}
    </AdminLocaleContext.Provider>
  );
}

export function useAdminLocale() {
  const context = React.useContext(AdminLocaleContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      locale: 'ar' as AdminLocale,
      isRTL: true,
      setLocale: () => {},
      t: adminTranslations.ar,
    };
  }
  return context;
}
