'use client';

import * as React from 'react';

export type AdminTheme = 'light' | 'dark' | 'system';

interface AdminThemeContextType {
  theme: AdminTheme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: AdminTheme) => void;
}

const AdminThemeContext = React.createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<AdminTheme>('dark');
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('dark');

  const applyTheme = React.useCallback((selectedTheme: AdminTheme) => {
    let resolved: 'light' | 'dark' = 'dark';

    if (selectedTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = systemPrefersDark ? 'dark' : 'light';
    } else {
      resolved = selectedTheme;
    }

    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, []);

  React.useEffect(() => {
    const saved = localStorage.getItem('ishoot_admin_theme') as AdminTheme;
    const initial = (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'dark';
    setThemeState(initial);
    applyTheme(initial);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = localStorage.getItem('ishoot_admin_theme') as AdminTheme;
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  const setTheme = (newTheme: AdminTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('ishoot_admin_theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <AdminThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext);
  if (!context) {
    return {
      theme: 'dark' as AdminTheme,
      resolvedTheme: 'dark' as 'light' | 'dark',
      setTheme: () => {},
    };
  }
  return context;
}
