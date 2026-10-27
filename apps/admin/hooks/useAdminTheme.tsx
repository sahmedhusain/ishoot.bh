"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  normalizeAdminAppearance,
  type AdminAppearance,
} from "../lib/admin-appearance";

export type AdminTheme = "light" | "dark" | "system";

const STORAGE_KEY = "platform_admin_theme";

interface AdminThemeContextType {
  theme: AdminTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: AdminTheme) => void;
  appearance: AdminAppearance;
  setAppearance: (appearance: AdminAppearance) => void;
}

const AdminThemeContext = React.createContext<
  AdminThemeContextType | undefined
>(undefined);

export function AdminThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  /** The company's default mode, used until a person picks their own. */
  defaultTheme?: AdminTheme;
}) {
  const [appearance, setAppearanceState] = React.useState(DEFAULT_APPEARANCE);
  const applyAppearance = React.useCallback((value: AdminAppearance) => {
    setAppearanceState(value);
    for (const [key, entry] of Object.entries(value))
      document.documentElement.dataset[key] = entry;
  }, []);
  React.useEffect(() => {
    try {
      applyAppearance(
        normalizeAdminAppearance(
          JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || "null"),
        ),
      );
    } catch {
      applyAppearance(DEFAULT_APPEARANCE);
    }
  }, [applyAppearance]);
  const setAppearance = (value: AdminAppearance) => {
    const normalized = normalizeAdminAppearance(value);
    applyAppearance(normalized);
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  };

  const [theme, setThemeState] = React.useState<AdminTheme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    "dark",
  );

  const applyTheme = React.useCallback((selectedTheme: AdminTheme) => {
    let resolved: "light" | "dark" = "dark";

    if (selectedTheme === "system") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      resolved = systemPrefersDark ? "dark" : "light";
    } else {
      resolved = selectedTheme;
    }

    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, []);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AdminTheme;
    const initial =
      saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : defaultTheme;
    setThemeState(initial);
    applyTheme(initial);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = localStorage.getItem(STORAGE_KEY) as AdminTheme;
      if (
        current === "system" ||
        (current !== "light" && current !== "dark" && defaultTheme === "system")
      ) {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [applyTheme, defaultTheme]);

  const setTheme = (newTheme: AdminTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  };

  return (
    <AdminThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, appearance, setAppearance }}
    >
      <MotionConfig
        reducedMotion={appearance.motion === "system" ? "user" : "always"}
      >
        {children}
      </MotionConfig>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext);
  if (!context) {
    return {
      theme: "dark" as AdminTheme,
      resolvedTheme: "dark" as "light" | "dark",
      setTheme: () => {},
      appearance: DEFAULT_APPEARANCE,
      setAppearance: () => {},
    };
  }
  return context;
}
