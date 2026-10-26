"use client";

import * as React from "react";
import { Card } from "@platform/ui";
import { Globe, Sun, Moon, Laptop, Palette } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme, AdminTheme } from "../../hooks/useAdminTheme";
import { SettingsNavTabs } from "./SettingsNavTabs";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-surface-sunken border border-ink/10">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${active ? "bg-accent text-white shadow-sm" : "text-ink-muted hover:text-ink hover:bg-ink/5"
              }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesView() {
  const { t, locale, setLocale } = useAdminLocale();
  const { theme, setTheme } = useAdminTheme();

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <SettingsNavTabs />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
          {t.preferences.title}
        </h1>
        <p className="text-xs text-ink-muted mt-1">{t.preferences.subtitle}</p>
      </div>

      <Card className="p-0 bg-surface border border-ink/10 rounded-3xl divide-y divide-ink/10">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-ink">{t.preferences.sysLangTitle}</h2>
          </div>
          <Segmented<"ar" | "en">
            label={t.preferences.sysLangTitle}
            value={locale}
            onChange={setLocale}
            options={[
              { value: "ar", label: t.preferences.arabicLabel },
              { value: "en", label: t.preferences.englishLabel },
            ]}
          />
        </div>

        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-ink">{t.preferences.themeTitle}</h2>
          </div>
          <Segmented<AdminTheme>
            label={t.preferences.themeTitle}
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: t.preferences.lightTitle, icon: <Sun className="w-3.5 h-3.5" /> },
              { value: "dark", label: t.preferences.darkTitle, icon: <Moon className="w-3.5 h-3.5" /> },
              { value: "system", label: t.preferences.systemTitle, icon: <Laptop className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
