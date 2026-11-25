"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useSnackbar } from "../ui/snackbar";

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

function M3Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex h-8 w-[52px] items-center rounded-full border-2 transition-colors duration-fast cursor-pointer ${
          checked
            ? "bg-m3-primary border-m3-primary"
            : "bg-m3-surface-container-highest border-m3-outline"
        }`}
      >
        <span
          className={`inline-block rounded-full transition-all duration-fast ${
            checked
              ? "h-6 w-6 translate-x-5 rtl:-translate-x-5 bg-m3-on-primary"
              : "h-4 w-4 translate-x-1 rtl:-translate-x-1 bg-m3-outline"
          }`}
        />
      </span>
    </span>
  );
}

export function CookieConsentBanner() {
  const { t, locale, isRTL } = useTranslation();
  const snackbar = useSnackbar();
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
    snackbar.show({
      message: t("shared.common.saved"),
      variant: "success",
    });
  };

  if (!bannerOpen && !modalOpen) return null;

  return (
    <>
      {bannerOpen && !modalOpen && (
        <aside
          role="region"
          aria-label={t("cookies.bannerTitle")}
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-4xl rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container-high border border-m3-outline-variant shadow-m3-4 p-5 sm:p-6 text-m3-on-surface"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-11 h-11 rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center shrink-0">
                <Cookie aria-hidden="true" className="w-5 h-5" />
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
                className="min-h-11 px-4 rounded-full border border-m3-outline text-xs font-semibold text-m3-primary hover:bg-m3-primary/[0.08] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("cookies.customize")}</span>
              </button>
              <button
                type="button"
                onClick={() => saveChoice(false, false)}
                className="min-h-11 px-4 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-semibold hover:brightness-95 transition-colors cursor-pointer"
              >
                {t("cookies.essentialOnly")}
              </button>
              <button
                type="button"
                onClick={() => saveChoice(true, true)}
                className="min-h-11 px-5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:brightness-95 shadow-m3-1 transition-colors cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container-high border border-m3-outline-variant shadow-m3-5 overflow-hidden text-m3-on-surface">
            <div className="flex items-center justify-between px-6 py-5 border-b border-m3-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center shrink-0">
                  <ShieldCheck aria-hidden="true" className="w-5 h-5" />
                </div>
                <h2 id="cookie-preferences-title" className="text-lg font-display font-bold text-m3-on-surface">
                  {t("cookies.bannerTitle")}
                </h2>
              </div>
              <button
                type="button"
                aria-label={t("footer.close")}
                onClick={() => setModalOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-m3-on-surface-variant hover:bg-m3-on-surface/[0.08] cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65dvh] overflow-y-auto">
              <p className="text-xs sm:text-sm text-m3-on-surface-variant leading-relaxed">
                {t("cookies.policyIntro")}
              </p>

              <div className="rounded-[var(--md-sys-shape-corner-large,16px)] border border-m3-outline-variant bg-m3-surface-container p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-m3-on-surface">{t("cookies.essentialTitle")}</p>
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    {t("cookies.essentialDesc")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-3 py-1 text-[11px] font-semibold">
                  {t("cookies.statusActive")}
                </span>
              </div>

              <label className="rounded-[var(--md-sys-shape-corner-large,16px)] border border-m3-outline-variant bg-m3-surface-container p-4 flex items-center justify-between gap-4 cursor-pointer">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-m3-on-surface">{t("cookies.preferencesTitle")}</p>
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    {t("cookies.preferencesDesc")}
                  </p>
                </div>
                <M3Switch checked={prefsEnabled} onChange={setPrefsEnabled} />
              </label>

              <label className="rounded-[var(--md-sys-shape-corner-large,16px)] border border-m3-outline-variant bg-m3-surface-container p-4 flex items-center justify-between gap-4 cursor-pointer">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-m3-on-surface">{t("cookies.analyticsTitle")}</p>
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    {t("cookies.analyticsDesc")}
                  </p>
                </div>
                <M3Switch checked={analyticsEnabled} onChange={setAnalyticsEnabled} />
              </label>
            </div>

            <div className="px-6 py-4 border-t border-m3-outline-variant flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => saveChoice(false, false)}
                className="min-h-11 px-4 rounded-full text-xs font-semibold text-m3-primary hover:bg-m3-primary/[0.08] transition-colors cursor-pointer"
              >
                {t("cookies.essentialOnly")}
              </button>
              <button
                type="button"
                onClick={() => saveChoice(prefsEnabled, analyticsEnabled)}
                className="min-h-11 px-5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:brightness-95 shadow-m3-1 transition-colors cursor-pointer"
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
