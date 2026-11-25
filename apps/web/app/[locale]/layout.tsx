import { isWebsitePreview } from "../../lib/website";
import Script from "next/script";
import { PreviewBridge } from "../../components/site/PreviewBridge";
import { TelemetryMonitor } from "../../components/TelemetryMonitor";
import * as React from "react";
import { PhoneCountryProvider, CompanyCurrencyProvider, SnackbarProvider } from "@platform/ui";
import { isRtlLocale } from "@platform/locales/registry";
import { formatMessage } from "@platform/locales";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { isValidLocale } from "../../lib/i18n";
import { getSite, requireSiteLanguage, siteTranslations } from "../../lib/site";
import { Navbar, type NavbarSearchEntry } from "../../components/layout/Navbar";
import { siteMenus } from "../../lib/menus";
import { SiteAnalytics, SiteCustomCode } from "../../components/site/SiteCode";
import { Footer } from "../../components/layout/Footer";
import { CookieConsentBanner } from "../../components/layout/CookieConsentBanner";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { BackToTop } from "../../components/layout/BackToTop";
import { SiteThemeProvider, SiteRegion } from "../../components/site/SiteTheme";
import { siteBaseTone, siteThemeBootstrap } from "@platform/database/constants/website-design";
import { WebsiteOffline } from "../../components/layout/WebsiteOffline";
import { SiteProvider } from "../../components/site/SiteProvider";
import { getSiteCode, getSocialLinks, isCompanySetupCompleted } from "@platform/database";
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

  if ((!enabled || !website) && !preview) {
    return (
      <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={siteBaseTone(config.design, config.design.defaultMode)} data-site-tone={siteBaseTone(config.design, config.design.defaultMode)} data-site-mode={config.design.defaultMode} data-site-motion={config.design.motion} data-site-density={config.design.density} data-site-header={config.design.headerLayout ?? "standard"} data-site-footer={config.design.footerLayout ?? "standard"} data-site-width={config.design.contentWidth} suppressHydrationWarning>
        {head}
        <body className={`min-h-screen bg-m3-surface text-m3-on-surface ${isRTL ? "font-arabic" : "font-sans"}`}>
          <Script id="site-theme-init" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: siteThemeBootstrap(config.design) }} />
          {enabled && website && !preview && code ? <SiteAnalytics code={code} nonce={nonce} /> : null}
          <WebsiteOffline company={company} locale={locale} t={t} />
        </body>
      </html>
    );
  }

  return (
    <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={siteBaseTone(config.design, config.design.defaultMode)} data-site-tone={siteBaseTone(config.design, config.design.defaultMode)} data-site-mode={config.design.defaultMode} data-site-motion={config.design.motion} data-site-density={config.design.density} data-site-header={config.design.headerLayout ?? "standard"} data-site-footer={config.design.footerLayout ?? "standard"} data-site-width={config.design.contentWidth} suppressHydrationWarning>
      {head}
      <body
        className={`min-h-screen bg-m3-surface text-m3-on-surface selection:bg-m3-primary/25 selection:text-m3-on-surface ${isRTL ? "font-arabic" : "font-sans"}`}
        data-activity={info.activity}
      >
        <Script id="site-theme-init" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: siteThemeBootstrap(config.design) }} />
        {enabled && website && !preview && code ? <SiteAnalytics code={code} nonce={nonce} /> : null}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-m3-primary focus:text-m3-on-primary focus:px-4 focus:py-2.5 focus:rounded-full focus:shadow-m3-3 focus:text-sm focus:font-semibold"
        >
          {t.common.skipContent}
        </a>
        {preview && (
          <div className="fixed bottom-4 start-4 z-[100] bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-outline-variant px-4 py-2.5 rounded-full shadow-m3-3 flex gap-4 items-center text-xs font-semibold">
            <span>{t.common.preview}</span>
            <form method="post" action="/api/preview">
              <button className="underline hover:opacity-80 cursor-pointer">{t.common.exitPreview}</button>
            </form>
          </div>
        )}
        {preview && adminOrigin ? <PreviewBridge adminOrigin={adminOrigin} /> : null}
        <SiteThemeProvider design={config.design}>
        <CompanyCurrencyProvider currency={company.default_currency}><PhoneCountryProvider country={company.country}><SiteProvider site={info}>
        <SnackbarProvider closeLabel={t.common.close}>
          <FloatingScrollbar />
          <BackToTop />
          <SmoothScroll>
            <SiteRegion region="header">
              <Navbar
                company={company}
                pages={config.pages}
                links={menus?.header}
                searchIndex={([
                  ...(website?.portfolio ?? []).slice(0, 12).map((item) => ({
                    id: `proj-${item.id}`,
                    title: pickText(item.title_en, item.title_ar, locale),
                    subtitle: item.category ? (locale === "ar" ? item.category.name_ar : item.category.name_en) : item.client_name ?? undefined,
                    href: `/${locale}/${info.collection.slug}/${encodeURIComponent(item.slug)}`,
                    group: "project" as const,
                  })),
                  ...(website?.articles ?? []).slice(0, 10).map((art) => ({
                    id: `art-${art.id}`,
                    title: pickText(art.title_en, art.title_ar, locale),
                    subtitle: art.category ?? undefined,
                    href: `/${locale}/${info.articles.slug}/${encodeURIComponent(art.slug)}`,
                    group: "article" as const,
                  })),
                ]) satisfies NavbarSearchEntry[]}
              />
            </SiteRegion>
            <SiteRegion as="main" region="page" id="main-content" className="w-full">
              <TelemetryMonitor />
              {children}
            </SiteRegion>
            <SiteRegion region="footer">
              <Footer company={company} socialLinks={socialLinks} pages={config.pages} links={menus?.footer} />
            </SiteRegion>
            <CookieConsentBanner />
            {!preview && code ? <SiteCustomCode code={code} nonce={nonce} /> : null}
          </SmoothScroll>
        </SnackbarProvider>
        </SiteProvider></PhoneCountryProvider></CompanyCurrencyProvider>
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
