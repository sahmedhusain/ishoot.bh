"use client";

import * as React from "react";
import { Card } from "@ishoot/ui";
import {
  Globe,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme, AdminTheme } from "../../hooks/useAdminTheme";
import { SettingsNavTabs } from "./SettingsNavTabs";

export function PreferencesView() {
  const { t, locale, setLocale } = useAdminLocale();
  const { theme, resolvedTheme, setTheme } = useAdminTheme();
  const [savedNotification, setSavedNotification] = React.useState<
    string | null
  >(null);

  const handleLanguageChange = (newLocale: "ar" | "en") => {
    setLocale(newLocale);
    setSavedNotification(t.preferences.savedLang);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const handleThemeChange = (newTheme: AdminTheme) => {
    setTheme(newTheme);
    const text =
      newTheme === "dark"
        ? t.preferences.savedDark
        : newTheme === "light"
          ? t.preferences.savedLight
          : t.preferences.savedSystem;
    setSavedNotification(text);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <SettingsNavTabs />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
          {t.preferences.title}
        </h1>
        <p className="text-xs text-ink-muted mt-1">{t.preferences.subtitle}</p>
      </div>

      {savedNotification && (
        <div className="p-4 rounded-2xl bg-accent/15 border border-accent/40 flex items-center gap-3 text-accent text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotification}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8 bg-surface border border-ink/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-ink/10">
          <Globe className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-base font-bold text-ink">
              {t.preferences.sysLangTitle}
            </h2>
            <p className="text-xs text-ink-muted">
              {t.preferences.sysLangSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => handleLanguageChange("ar")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              locale === "ar"
                ? "bg-primary/20 border-accent shadow-lg shadow-accent/10"
                : "bg-surface-sunken border-ink/10 hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">
                {t.preferences.arabicLabel}
              </span>
              {locale === "ar" && (
                <CheckCircle2 className="w-5 h-5 text-accent" />
              )}
            </div>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              {t.preferences.arabicDesc}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]  font-bold bg-ink/5 text-ink-muted">
              <span>RTL</span>
              <span>•</span>
              <span>IBM Plex Sans Arabic</span>
            </div>
          </div>

          <div
            onClick={() => handleLanguageChange("en")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              locale === "en"
                ? "bg-primary/20 border-accent shadow-lg shadow-accent/10"
                : "bg-surface-sunken border-ink/10 hover:border-ink/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">
                {t.preferences.englishLabel}
              </span>
              {locale === "en" && (
                <CheckCircle2 className="w-5 h-5 text-accent" />
              )}
            </div>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              {t.preferences.englishDesc}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]  font-bold bg-ink/5 text-ink-muted">
              <span>LTR</span>
              <span>•</span>
              <span>Inter Sans</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8 bg-surface border border-ink/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-ink/10">
          <Sparkles className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-base font-bold text-ink">
              {t.preferences.themeTitle}
            </h2>
            <p className="text-xs text-ink-muted">
              {t.preferences.themeSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => handleThemeChange("dark")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              theme === "dark"
                ? "bg-primary/20 border-accent shadow-lg shadow-accent/10"
                : "bg-surface-sunken border-ink/10 hover:border-ink/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center text-accent">
                  <Moon className="w-4 h-4" />
                </div>
                {theme === "dark" && (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="text-sm font-bold text-ink">
                {t.preferences.darkTitle}
              </div>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                {t.preferences.darkDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-ink/10 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-surface-sunken border border-ink/30" />
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-[10px] text-ink-muted ms-auto ">
                #050807
              </span>
            </div>
          </div>

          <div
            onClick={() => handleThemeChange("light")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              theme === "light"
                ? "bg-primary/20 border-accent shadow-lg shadow-accent/10"
                : "bg-surface-sunken border-ink/10 hover:border-ink/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center text-amber-400">
                  <Sun className="w-4 h-4" />
                </div>
                {theme === "light" && (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="text-sm font-bold text-ink">
                {t.preferences.lightTitle}
              </div>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                {t.preferences.lightDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-ink/10 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F8FAFC] border border-black/20" />
              <span className="w-3 h-3 rounded-full bg-[#FFFFFF] border border-black/20" />
              <span className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-[10px] text-ink-muted ms-auto ">
                #F8FAFC
              </span>
            </div>
          </div>

          <div
            onClick={() => handleThemeChange("system")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              theme === "system"
                ? "bg-primary/20 border-accent shadow-lg shadow-accent/10"
                : "bg-surface-sunken border-ink/10 hover:border-ink/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center text-ink-muted">
                  <Laptop className="w-4 h-4" />
                </div>
                {theme === "system" && (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="text-sm font-bold text-ink">
                {t.preferences.systemTitle}
              </div>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                {t.preferences.systemDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-ink/10 text-[10px] text-accent ">
              {t.preferences.activePrefix}
              {resolvedTheme === "dark"
                ? t.preferences.darkWord
                : t.preferences.lightWord}
            </div>
          </div>
        </div>
      </Card>

      <div className="p-4 rounded-2xl bg-ink/5 border border-ink/10 flex items-start gap-3">
        <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-ink">
            {t.preferences.numeralsTitle}
          </div>
          <p className="text-ink-muted leading-relaxed">
            {t.preferences.numeralsDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
