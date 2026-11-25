import { isWebsitePreview } from "../../lib/website";
import Script from "next/script";
import { StorePreviewBridge } from "../../components/site/StorePreviewBridge";
import { TelemetryMonitor } from "../../components/TelemetryMonitor";
import { storeEnabled, orderingEnabled } from "../../lib/customer";
import { getEffectiveStoreCategories, getStoreSettings } from "@platform/database";
import * as React from "react";
import { PhoneCountryProvider, CompanyCurrencyProvider } from "@platform/ui";
import { isRtlLocale } from "@platform/locales/registry";
import { formatMessage } from "@platform/locales";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { isValidLocale } from "../../lib/i18n";
import { getSite, requireSiteLanguage, siteTranslations } from "../../lib/site";
import { StoreNavbar } from "../../components/layout/StoreNavbar";
import { siteMenus } from "../../lib/menus";
import { SiteAnalytics, SiteCustomCode } from "../../components/site/SiteCode";
import { StoreFooter } from "../../components/layout/StoreFooter";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { BackToTop } from "../../components/layout/BackToTop";
import { SiteThemeProvider, StoreRegion } from "../../components/site/SiteTheme";
import { SnackbarProvider } from "../../components/ui/snackbar";
import { storeBaseTone, storeThemeBootstrap, type StoreDesign } from "../../lib/theme/store-design";
import { WebsiteOffline } from "../../components/layout/WebsiteOffline";
import { SiteProvider } from "../../components/site/SiteProvider";
import { getSiteCode, getSocialLinks, isCompanySetupCompleted } from "@platform/database";
import { UtmCapture } from "../../components/store/UtmCapture";
import { pickText } from "@platform/database/constants/languages";
import { googleFontsHref, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";

const originOf = (url?: string) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const configured = await isCompanySetupCompleted().catch(() => false);
  if (!configured) {
    return (
      <html lang={isValidLocale(locale) ? locale : "en"}>
        <body />
      </html>
    );
  }
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  if (!isValidLocale(locale)) {
    notFound();
  }
  await requireSiteLanguage(locale);

  const [{ company, config, info, enabled, website }, socialLinks, preview, t, code] = await Promise.all([
    getSite(),
    getSocialLinks(),
    isWebsitePreview(),
    siteTranslations(locale),
    getSiteCode().catch((error) => {
      console.error("Site code unavailable:", error);
      return null;
    }),
  ]);
  const isRTL = isRtlLocale(locale);
  const [store, ordering, storeSettings, effectiveCategories] = await Promise.all([
    storeEnabled().catch(() => false),
    orderingEnabled().catch(() => false),
    getStoreSettings().catch(() => null),
    getEffectiveStoreCategories(website?.categories ?? []).catch(() => website?.categories ?? []),
  ]);
  const announcementText = pickText(storeSettings?.announcement_en, storeSettings?.announcement_ar, locale) || undefined;
  const adminOrigin = originOf(process.env.ADMIN_URL);
  const menus = siteMenus(website, config, info, locale);
  const fontsHref = googleFontsHref(company.theme);
  const head = (
    <head>
      {fontsHref ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      ) : null}
      <style id="company-theme" nonce={nonce} dangerouslySetInnerHTML={{ __html: themeStylesheet(company.theme) + websiteThemeStylesheet(company.theme) }} />
    </head>
  );

  const storeDesign = config.design as StoreDesign;
  const corners = storeDesign.corners ?? "rounded";
  const borders = storeDesign.borders ?? "subtle";
  if ((!enabled || !website) && !preview) {
    return (
      <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={storeBaseTone(config.design, config.design.defaultMode)} data-site-tone={storeBaseTone(config.design, config.design.defaultMode)} data-site-mode={config.design.defaultMode} data-site-motion={config.design.motion} data-site-density={config.design.density} data-density={config.design.density} data-corners={corners} data-borders={borders} data-site-header={config.design.headerLayout ?? "standard"} data-site-footer={config.design.footerLayout ?? "standard"} data-site-width={config.design.contentWidth} suppressHydrationWarning>
        {head}
        <body className={`min-h-screen bg-brand-base text-ink ${isRTL ? "font-arabic" : "font-sans"}`}>
          <Script id="site-theme-init" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: storeThemeBootstrap(config.design) }} />
          {enabled && website && !preview && code ? <SiteAnalytics code={code} nonce={nonce} /> : null}
          <WebsiteOffline company={company} locale={locale} t={t} />
        </body>
      </html>
    );
  }

  return (
    <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={storeBaseTone(config.design, config.design.defaultMode)} data-site-tone={storeBaseTone(config.design, config.design.defaultMode)} data-site-mode={config.design.defaultMode} data-site-motion={config.design.motion} data-site-density={config.design.density} data-density={config.design.density} data-corners={corners} data-borders={borders} data-site-header={config.design.headerLayout ?? "standard"} data-site-footer={config.design.footerLayout ?? "standard"} data-site-width={config.design.contentWidth} suppressHydrationWarning>
      {head}
      <body
        className={`min-h-screen bg-brand-base text-ink selection:bg-accent/40 selection:text-paper ${isRTL ? "font-arabic" : "font-sans"}`}
        data-activity={info.activity}
      >
        <Script id="site-theme-init" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: storeThemeBootstrap(config.design) }} />
        {enabled && website && !preview && code ? <SiteAnalytics code={code} nonce={nonce} /> : null}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:rounded-full focus:bg-m3-primary focus:text-m3-on-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:shadow-m3-2"
        >
          {t.common.skipContent}
        </a>
        {preview && (
          <div className="fixed bottom-4 start-4 z-[100] bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-outline-variant px-4 py-2.5 rounded-2xl shadow-m3-2 flex gap-4 items-center text-sm font-medium">
            <span>{t.common.preview}</span>
            <form method="post" action="/api/preview">
              <button className="underline font-semibold cursor-pointer">{t.common.exitPreview}</button>
            </form>
          </div>
        )}
        {preview && adminOrigin ? <StorePreviewBridge adminOrigin={adminOrigin} /> : null}
        <SiteThemeProvider design={config.design}>
        <SnackbarProvider>
        <CompanyCurrencyProvider currency={company.default_currency}><PhoneCountryProvider country={company.country}><SiteProvider site={info}>
          <FloatingScrollbar />
          <BackToTop />
          <UtmCapture />
          <SmoothScroll>
            <StoreNavbar
              cartEnabled={ordering}
              company={company}
              pages={config.pages}
              links={menus?.header}
              accountHref={store && config.commerce.capabilities.accounts ? `/${locale}/account` : undefined}
              cookieBannerEnabled={storeSettings?.cookie_banner_enabled ?? true}
              sslBadgeEnabled={storeSettings?.ssl_badge_enabled ?? true}
              categories={effectiveCategories}
              showCategoryBar={storeSettings?.show_category_bar ?? true}
              announcement={announcementText}
            />
            <StoreRegion as="main" region="page" id="main-content" className="w-full">
              <TelemetryMonitor />
              {children}
            </StoreRegion>
            <StoreFooter
              company={company}
              socialLinks={socialLinks}
              sslBadgeEnabled={storeSettings?.ssl_badge_enabled ?? true}
              crNumber={storeSettings?.cr_number || undefined}
            />
            {!preview && code ? <SiteCustomCode code={code} nonce={nonce} /> : null}
          </SmoothScroll>
        </SiteProvider></PhoneCountryProvider></CompanyCurrencyProvider>
        </SnackbarProvider>
        </SiteThemeProvider>
      </body>
    </html>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const [{ company, config, info }, { seo }] = await Promise.all([getSite(), siteTranslations(locale)]);
  const companyName = pickText(company.company_name_en, company.company_name_ar, locale);
  const title = pickText(config.seo.titleEn, config.seo.titleAr, locale) || formatMessage(seo.title, { companyName });
  const description =
    pickText(config.seo.descriptionEn, config.seo.descriptionAr, locale) ||
    pickText(company.tagline_en, company.tagline_ar, locale) ||
    formatMessage(seo.description, { companyName });
  return {
    title,
    description,
    alternates: { languages: Object.fromEntries(info.languages.map((language) => [language, `/${language}`])) },
    openGraph: {
      title,
      description,
      locale,
    },
    ...((await isWebsitePreview())
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
