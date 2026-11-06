import { isWebsitePreview, websiteExample } from "../../lib/website";
import Script from "next/script";
import { PreviewBridge } from "../../components/site/PreviewBridge";
import { storeEnabled, orderingEnabled } from "../../lib/customer";
import * as React from "react";
import { PhoneCountryProvider, CompanyCurrencyProvider } from "@platform/ui";
import { isRtlLocale } from "@platform/locales/registry";
import { formatMessage } from "@platform/locales";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n";
import { getSite, requireSiteLanguage, siteTranslations } from "../../lib/site";
import { Navbar } from "../../components/layout/Navbar";
import { siteMenus } from "../../lib/menus";
import { SiteAnalytics, SiteCustomCode } from "../../components/site/SiteCode";
import { Footer } from "../../components/layout/Footer";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { BackToTop } from "../../components/layout/BackToTop";
import { SiteThemeProvider, SiteRegion } from "../../components/site/SiteTheme";
import { siteBaseTone, siteThemeBootstrap } from "@platform/database/constants/website-design";
import { WebsiteOffline } from "../../components/layout/WebsiteOffline";
import { SiteProvider } from "../../components/site/SiteProvider";
import { getSiteCode, getSocialLinks } from "@platform/database";
import { UtmCapture } from "../../components/store/UtmCapture";
import { pickText } from "@platform/database/constants/languages";
import { googleFontsHref, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";

/** The admin app's origin, the only one a preview frame takes theme changes from. */
const originOf = (url?: string) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};
// Database content must not be frozen into empty pages when the build database is unavailable.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }
  await requireSiteLanguage(locale);

  const [{ company, config, info, enabled, website }, socialLinks, preview, example, t, code] = await Promise.all([
    getSite(),
    getSocialLinks(),
    isWebsitePreview(),
    websiteExample(),
    siteTranslations(locale),
    // IT's site-wide code; the website still renders when the system service cannot be reached.
    getSiteCode().catch((error) => {
      console.error("Site code unavailable:", error);
      return null;
    }),
  ]);
  const isRTL = isRtlLocale(locale);
  const [store, ordering] = await Promise.all([storeEnabled().catch(() => false), orderingEnabled().catch(() => false)]);
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
      <style id="company-theme" dangerouslySetInnerHTML={{ __html: themeStylesheet(company.theme) + websiteThemeStylesheet(company.theme) }} />
      <Script id="site-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: siteThemeBootstrap(config.design) }} />
      {enabled && website && !preview && code ? <SiteAnalytics code={code} /> : null}
    </head>
  );

  // A company without a public website (or one not published/configured yet) still owns its address: show who it is
  // and how to reach it.
  if ((!enabled || !website || !company.setup_completed) && !preview) {
    return (
      <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={siteBaseTone(config.design, config.design.defaultMode)} data-site-tone={siteBaseTone(config.design, config.design.defaultMode)} data-site-mode={config.design.defaultMode} data-site-motion={config.design.motion} data-site-density={config.design.density} data-site-header={config.design.headerLayout ?? "standard"} data-site-footer={config.design.footerLayout ?? "standard"} data-site-width={config.design.contentWidth} suppressHydrationWarning>
        {head}
        <body className={`min-h-screen bg-brand-base text-ink ${isRTL ? "font-arabic" : "font-sans"}`}>
          <WebsiteOffline company={company} locale={locale} t={t} />
        </body>
      </html>
    );
  }

  return (
    <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={siteBaseTone(config.design, config.design.defaultMode)} data-site-tone={siteBaseTone(config.design, config.design.defaultMode)} data-site-mode={config.design.defaultMode} data-site-motion={config.design.motion} data-site-density={config.design.density} data-site-header={config.design.headerLayout ?? "standard"} data-site-footer={config.design.footerLayout ?? "standard"} data-site-width={config.design.contentWidth} suppressHydrationWarning>
      {head}
      <body
        className={`min-h-screen bg-brand-base text-ink selection:bg-accent/40 selection:text-paper ${isRTL ? "font-arabic" : "font-sans"}`}
        data-activity={info.activity}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-white focus:text-black focus:p-3"
        >
          {t.common.skipContent}
        </a>
        {preview && (
          <div className="fixed bottom-4 start-4 z-[100] bg-amber-100 text-amber-950 p-3 rounded-lg shadow-lg flex gap-4 items-center text-sm">
            <span>{example ? t.common.examplePreview : t.common.preview}</span>
            <form method="post" action="/api/preview">
              <button className="underline">{t.common.exitPreview}</button>
            </form>
          </div>
        )}
        {preview && adminOrigin ? <PreviewBridge adminOrigin={adminOrigin} /> : null}
        <SiteThemeProvider design={config.design}>
        <CompanyCurrencyProvider currency={company.default_currency}><PhoneCountryProvider country={company.country}><SiteProvider site={info}>
          <FloatingScrollbar />
          <BackToTop />
          <UtmCapture />
          <SmoothScroll>
            <Navbar cartEnabled={ordering} company={company} pages={config.pages} links={menus?.header} accountHref={store && config.commerce.capabilities.accounts ? `/${locale}/account` : undefined} />
            <SiteRegion as="main" region="page" id="main-content" className="w-full">
              {children}
            </SiteRegion>
            <Footer company={company} socialLinks={socialLinks} pages={config.pages} links={menus?.footer} />
            {!preview && code ? <SiteCustomCode code={code} /> : null}
          </SmoothScroll>
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
    pickText(config.seo.descriptionEn, config.seo.descriptionAr, locale) || pickText(company.tagline_en, company.tagline_ar, locale) || seo.description;
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
