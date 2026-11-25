"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

export interface CookiePreferences {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "company_cookie_consent_v1";
const COOKIE_NAME = "company_cookie_consent";
export const OPEN_COOKIE_PREFERENCES_EVENT = "open-cookie-preferences";

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
  }
}

function readStoredConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    return {
      essential: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persistConsent(prefs: CookiePreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ preferences: prefs.preferences, analytics: prefs.analytics }))}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore storage quota or restricted test environment errors.
  }
}

export function CookieConsentBanner() {
  const { t, locale, isRTL } = useTranslation();
  const [bannerOpen, setBannerOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [prefsEnabled, setPrefsEnabled] = React.useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(true);

  React.useEffect(() => {
    const existing = readStoredConsent();
    if (!existing) {
      setBannerOpen(true);
    } else {
      setPrefsEnabled(existing.preferences);
      setAnalyticsEnabled(existing.analytics);
    }
    const handler = () => {
      const current = readStoredConsent();
      if (current) {
        setPrefsEnabled(current.preferences);
        setAnalyticsEnabled(current.analytics);
      }
      setModalOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler);
  }, []);

  const saveChoice = (preferences: boolean, analytics: boolean) => {
    const payload: CookiePreferences = {
      essential: true,
      preferences,
      analytics,
      updatedAt: new Date().toISOString(),
    };
    setPrefsEnabled(preferences);
    setAnalyticsEnabled(analytics);
    persistConsent(payload);
    setBannerOpen(false);
    setModalOpen(false);
  };

  if (!bannerOpen && !modalOpen) return null;

  return (
    <>
      {bannerOpen && !modalOpen && (
        <aside
          role="region"
          aria-label={t("cookies.bannerTitle")}
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-4xl rounded-3xl bg-m3-surface-container-high/95 backdrop-blur-xl border border-m3-outline-variant shadow-m3-4 p-5 sm:p-6 text-m3-on-surface"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-11 h-11 rounded-2xl bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-sm sm:text-base font-display font-bold text-m3-on-surface">
                  {t("cookies.bannerTitle")}
                </h2>
                <p className="text-xs sm:text-sm text-m3-on-surface-variant leading-relaxed">
                  {t("cookies.bannerDesc")}{" "}
                  <Link
                    href={`/${locale}/cookies`}
                    className="font-semibold text-m3-primary underline underline-offset-4 hover:opacity-85"
                  >
                    {t("footer.cookies")}
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="min-h-11 px-4 rounded-full border border-m3-outline text-xs font-semibold text-m3-on-surface hover:bg-m3-surface-container transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t("cookies.customize")}</span>
              </button>
              <button
                type="button"
                onClick={() => saveChoice(false, false)}
                className="min-h-11 px-4 rounded-full border border-m3-outline text-xs font-semibold text-m3-on-surface hover:bg-m3-surface-container transition-colors cursor-pointer"
              >
                {t("cookies.essentialOnly")}
              </button>
              <button
                type="button"
                onClick={() => saveChoice(true, true)}
                className="min-h-11 px-5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:bg-m3-primary/90 shadow-m3-1 transition-colors cursor-pointer"
              >
                {t("cookies.acceptAll")}
              </button>
            </div>
          </div>
        </aside>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl rounded-3xl bg-m3-surface-container-low border border-m3-outline-variant shadow-m3-5 overflow-hidden text-m3-on-surface">
            <div className="flex items-center justify-between px-6 py-5 border-b border-m3-outline-variant bg-m3-surface-container">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-m3-primary" />
                <h2 id="cookie-preferences-title" className="text-lg font-display font-bold">
                  {t("cookies.bannerTitle")}
                </h2>
              </div>
              <button
                type="button"
                aria-label={t("footer.close")}
                onClick={() => setModalOpen(false)}
                className="w-11 h-11 rounded-full border border-m3-outline-variant flex items-center justify-center hover:bg-m3-surface-container-high cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-m3-on-surface-variant leading-relaxed">
                {t("cookies.policyIntro")}
              </p>

              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t("cookies.essentialTitle")}</p>
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    {t("cookies.essentialDesc")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-3 py-1 text-[11px] font-semibold">
                  {t("cookies.statusActive")}
                </span>
              </div>

              <label className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-4 flex items-start justify-between gap-4 cursor-pointer">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t("cookies.preferencesTitle")}</p>
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    {t("cookies.preferencesDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefsEnabled}
                  onChange={(e) => setPrefsEnabled(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-m3-primary cursor-pointer"
                />
              </label>

              <label className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-4 flex items-start justify-between gap-4 cursor-pointer">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t("cookies.analyticsTitle")}</p>
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    {t("cookies.analyticsDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-m3-primary cursor-pointer"
                />
              </label>
            </div>

            <div className="px-6 py-4 border-t border-m3-outline-variant bg-m3-surface-container flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => saveChoice(false, false)}
                className="min-h-11 px-4 rounded-full border border-m3-outline text-xs font-semibold hover:bg-m3-surface-container-high cursor-pointer"
              >
                {t("cookies.essentialOnly")}
              </button>
              <button
                type="button"
                onClick={() => saveChoice(prefsEnabled, analyticsEnabled)}
                className="min-h-11 px-5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:bg-m3-primary/90 cursor-pointer"
              >
                {t("cookies.savePreferences")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
