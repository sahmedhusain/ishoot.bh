"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Cookie, Globe, Lock, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { STORE_REGIONS, type StoreRegionSpec } from "@platform/database/constants/store";
import { getCurrencyDecimals, getCurrencySymbol } from "@platform/config/currency";
import { getCanonicalRegionName } from "@platform/config/phone";
import { useTranslation } from "../../hooks/useTranslation";
import { useSite } from "../site/SiteProvider";
import { useSiteTheme } from "../site/SiteTheme";
import { useCompanyCurrency } from "../ui/currency-display";
import { useCompanyCountry } from "../ui/phone-input";

const REGION_STORAGE_KEY = "store-region-code";
const COOKIE_STORAGE_KEY = "store-cookie-consent";
const REGION_EVENT = "store-region-change";
const OPEN_PREFS_EVENT = "store-open-preferences";
const OPEN_COOKIE_EVENT = "store-open-cookie-settings";

export interface CookieConsentState {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: String(parsed.updatedAt ?? ""),
    };
  } catch {
    return null;
  }
}

export function openPreferencesModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_PREFS_EVENT));
  }
}

export function openCookieSettingsModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_COOKIE_EVENT));
  }
}

export function useStorePreferences() {
  const site = useSite();
  const companyCurrency = useCompanyCurrency();
  const companyCountry = useCompanyCountry();
  const baseSpec = STORE_REGIONS[0];

  const resolvedCurrency = (site?.currency || companyCurrency || baseSpec.currency).trim().toUpperCase();
  const resolvedCode = (site?.country || companyCountry || baseSpec.code).trim().toUpperCase();
  const resolvedNameEn = site?.city
    ? `${site.city}, ${getCanonicalRegionName(resolvedCode, "en") || resolvedCode}`
    : (getCanonicalRegionName(resolvedCode, "en") || baseSpec.name_en);
  const resolvedNameAr = site?.city
    ? `${site.city}، ${getCanonicalRegionName(resolvedCode, "ar") || resolvedCode}`
    : (getCanonicalRegionName(resolvedCode, "ar") || baseSpec.name_ar);

  const companyRegion: StoreRegionSpec = React.useMemo(
    () => ({
      code: resolvedCode,
      currency: resolvedCurrency,
      currencySymbol: getCurrencySymbol(resolvedCurrency, false) || resolvedCurrency,
      name_en: resolvedNameEn,
      name_ar: resolvedNameAr,
      multiplier: 1,
      freeShippingOver: baseSpec.freeShippingOver,
      flag: resolvedCode,
    }),
    [baseSpec.freeShippingOver, resolvedCode, resolvedCurrency, resolvedNameAr, resolvedNameEn],
  );
  const companyRegions = React.useMemo(() => [companyRegion], [companyRegion]);

  const [cookieConsent, setCookieConsentState] = React.useState<CookieConsentState | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setCookieConsentState(readCookieConsent());
    const sync = () => {
      setCookieConsentState(readCookieConsent());
    };
    window.addEventListener(REGION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REGION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setRegionCode = React.useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (normalized !== companyRegion.code && normalized !== companyRegion.currency) return;
      try {
        window.localStorage.setItem(REGION_STORAGE_KEY, companyRegion.code);
        window.dispatchEvent(new Event(REGION_EVENT));
      } catch {
        return;
      }
    },
    [companyRegion.code, companyRegion.currency],
  );

  const saveCookieConsent = React.useCallback((analytics: boolean, marketing: boolean) => {
    const next: CookieConsentState = {
      essential: true,
      analytics,
      marketing,
      updatedAt: new Date().toISOString(),
    };
    setCookieConsentState(next);
    try {
      window.localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(REGION_EVENT));
    } catch {
      return;
    }
  }, []);

  const convertFromBase = React.useCallback(
    (amountBase: number) => {
      if (!Number.isFinite(amountBase)) return 0;
      const decimals = getCurrencyDecimals(companyRegion.currency);
      return Number(amountBase.toFixed(decimals));
    },
    [companyRegion.currency],
  );

  return {
    mounted,
    regionCode: companyRegion.code,
    region: companyRegion,
    regions: companyRegions,
    setRegionCode,
    cookieConsent,
    saveCookieConsent,
    convertFromBase,
  };
}

export function StorePreferencesBar({
  cookieBannerEnabled = true,
  sslBadgeEnabled = true,
}: {
  cookieBannerEnabled?: boolean;
  sslBadgeEnabled?: boolean;
}) {
  const { t, locale, isRTL } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useSiteTheme();
  const {
    mounted,
    region,
    regions,
    setRegionCode,
    cookieConsent,
    saveCookieConsent,
  } = useStorePreferences();

  const [prefsOpen, setPrefsOpen] = React.useState(false);
  const [cookiesOpen, setCookiesOpen] = React.useState(false);
  const [analyticsDraft, setAnalyticsDraft] = React.useState(true);
  const [marketingDraft, setMarketingDraft] = React.useState(false);

  React.useEffect(() => {
    const onOpenPrefs = () => setPrefsOpen(true);
    const onOpenCookies = () => {
      setAnalyticsDraft(cookieConsent?.analytics ?? true);
      setMarketingDraft(cookieConsent?.marketing ?? false);
      setCookiesOpen(true);
    };
    window.addEventListener(OPEN_PREFS_EVENT, onOpenPrefs);
    window.addEventListener(OPEN_COOKIE_EVENT, onOpenCookies);
    return () => {
      window.removeEventListener(OPEN_PREFS_EVENT, onOpenPrefs);
      window.removeEventListener(OPEN_COOKIE_EVENT, onOpenCookies);
    };
  }, [cookieConsent]);

  const switchLocale = (targetLocale: "en" | "ar") => {
    if (targetLocale === locale) return;
    const segments = (pathname || "/en").split("/");
    segments[1] = targetLocale;
    router.push(segments.join("/") || `/${targetLocale}`);
    setPrefsOpen(false);
  };

  return (
    <>
      {mounted && cookieBannerEnabled && !cookieConsent && (
        <aside
          role="region"
          aria-label={t("store.cookiesTitle", { defaultValue: "Cookies & Privacy" })}
          data-testid="cookie-consent-banner"
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed bottom-16 md:bottom-4 inset-x-4 sm:inset-x-auto sm:end-4 sm:max-w-md z-40 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-high/95 backdrop-blur-md p-4 shadow-xl text-sm text-ink space-y-3"
        >
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-ink">
                {t("store.cookiesTitle", { defaultValue: "Cookies & Privacy Choices" })}
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                {t("store.cookiesSummary", {
                  defaultValue:
                    "We use essential cookies for cart, security, and checkout, plus optional analytics cookies to improve your shopping experience.",
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="cookie-accept-all"
              onClick={() => saveCookieConsent(true, true)}
              className="px-3.5 py-1.5 rounded-full bg-brand-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              {t("store.cookiesAcceptAll", { defaultValue: "Accept All" })}
            </button>
            <button
              type="button"
              data-testid="cookie-essential-only"
              onClick={() => saveCookieConsent(false, false)}
              className="px-3.5 py-1.5 rounded-full border border-m3-outline-variant bg-m3-surface text-xs font-medium text-ink hover:bg-m3-surface-container-low transition-colors"
            >
              {t("store.cookiesEssentialOnly", { defaultValue: "Essential Only" })}
            </button>
            <button
              type="button"
              data-testid="cookie-customize"
              onClick={() => {
                setAnalyticsDraft(true);
                setMarketingDraft(false);
                setCookiesOpen(true);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-brand-primary hover:underline inline-flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              {t("store.cookieSettings", { defaultValue: "Cookie Settings" })}
            </button>
          </div>
        </aside>
      )}

      {prefsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("store.preferencesTitle", { defaultValue: "Store Preferences" })}
          data-testid="welcome-modal"
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPrefsOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6 shadow-2xl space-y-5 text-ink">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                  {t("store.preferencesTitle", { defaultValue: "Store & Regional Preferences" })}
                </h2>
                <p className="text-xs text-ink-muted">
                  {t("store.preferencesSubtitle", {
                    defaultValue: "Choose your currency, shipping country, language, and theme.",
                  })}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("footer.close", { defaultValue: "Close" })}
                onClick={() => setPrefsOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-m3-surface-container-high transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("store.currencyRegionLabel", { defaultValue: "Store Currency & Location" })}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {regions.map((item) => {
                  const active = item.code === region.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      data-testid={`region-option-${item.currency}`}
                      onClick={() => setRegionCode(item.code)}
                      className={`rounded-xl border px-3 py-2 text-start transition-colors ${
                        active
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold"
                          : "border-m3-outline-variant bg-m3-surface text-ink hover:border-brand-primary/50"
                      }`}
                    >
                      <div className="text-xs font-bold">{item.currency}</div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {locale === "ar" ? item.name_ar : item.name_en}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {t("store.languageLabel", { defaultValue: "Language" })}
                </p>
                <div className="flex gap-2">
                  {(["en", "ar"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => switchLocale(lang)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                        locale === lang
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                          : "border-m3-outline-variant bg-m3-surface text-ink"
                      }`}
                    >
                      {lang === "en" ? "English" : "العربية"}
                    </button>
                  ))}
                </div>
              </div>

              {theme && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {t("store.appearanceLabel", { defaultValue: "Appearance" })}
                  </p>
                  <div className="flex gap-1.5">
                    {(["light", "dark", "system"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => theme.setMode(m)}
                        className={`flex-1 rounded-xl border px-2 py-2 text-xs font-medium capitalize transition-colors ${
                          theme.mode === m
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-m3-outline-variant bg-m3-surface text-ink"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-m3-outline-variant text-xs text-ink-muted">
              {sslBadgeEnabled ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  {t("store.sslSecuredLabel", { defaultValue: "256-Bit SSL Encrypted" })}
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                className="px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                {t("store.savePreferences", { defaultValue: "Apply Preferences" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {cookiesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("store.cookieSettings", { defaultValue: "Cookie Settings" })}
          data-testid="cookie-settings-modal"
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCookiesOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6 shadow-2xl space-y-4 text-ink">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold">
                  {t("store.cookieSettings", { defaultValue: "Cookie Settings" })}
                </h2>
              </div>
              <button
                type="button"
                aria-label={t("footer.close", { defaultValue: "Close" })}
                onClick={() => setCookiesOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-surface-container-high"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-m3-outline-variant bg-m3-surface p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {t("store.cookiesEssentialLabel", { defaultValue: "Essential Security & Cart" })}
                  </p>
                  <p className="text-ink-muted">
                    {t("store.cookiesEssentialDesc", {
                      defaultValue: "Required for shopping cart, account login, CSRF protection, and SSL checkout.",
                    })}
                  </p>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                  {t("store.cookiesAlwaysActive", { defaultValue: "Always On" })}
                </span>
              </div>

              <label className="rounded-xl border border-m3-outline-variant bg-m3-surface p-3 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="font-semibold text-ink">
                    {t("store.cookiesAnalyticsLabel", { defaultValue: "Analytics & Telemetry" })}
                  </p>
                  <p className="text-ink-muted">
                    {t("store.cookiesAnalyticsDesc", {
                      defaultValue: "Helps us monitor store performance and improve product discovery.",
                    })}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsDraft}
                  onChange={(e) => setAnalyticsDraft(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-primary shrink-0"
                />
              </label>

              <label className="rounded-xl border border-m3-outline-variant bg-m3-surface p-3 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="font-semibold text-ink">
                    {t("store.cookiesMarketingLabel", { defaultValue: "Marketing & Offers" })}
                  </p>
                  <p className="text-ink-muted">
                    {t("store.cookiesMarketingDesc", {
                      defaultValue: "Used for relevant promotions, gift vouchers, and seasonal bundle announcements.",
                    })}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketingDraft}
                  onChange={(e) => setMarketingDraft(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-primary shrink-0"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  saveCookieConsent(analyticsDraft, marketingDraft);
                  setCookiesOpen(false);
                }}
                className="px-4 py-2 rounded-full border border-m3-outline-variant bg-m3-surface text-xs font-semibold hover:bg-m3-surface-container-high"
              >
                {t("store.savePreferences", { defaultValue: "Save Preferences" })}
              </button>
              <button
                type="button"
                onClick={() => {
                  saveCookieConsent(true, true);
                  setCookiesOpen(false);
                }}
                className="px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold hover:opacity-90"
              >
                {t("store.cookiesAcceptAll", { defaultValue: "Accept All" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
