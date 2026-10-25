import { isWebsitePreview, websiteExample } from "../../lib/website";
import { PreviewBridge } from "../../components/site/PreviewBridge";
import { storeEnabled } from "../../lib/customer";
import * as React from "react";
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
import { WhatsAppButton } from "../../components/layout/WhatsAppButton";
import { WebsiteOffline } from "../../components/layout/WebsiteOffline";
import { SiteProvider } from "../../components/site/SiteProvider";
import { getSocialLinks } from "@platform/database";
import { UtmCapture } from "../../components/store/UtmCapture";
import { pickText } from "@platform/database/constants/languages";
import { googleFontsHref, themeStylesheet } from "@platform/database/constants/theme";

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

  const [{ company, config, info, enabled, website }, socialLinks, preview, example, t] = await Promise.all([
    getSite(),
    getSocialLinks(),
    isWebsitePreview(),
    websiteExample(),
    siteTranslations(locale),
  ]);
  const isRTL = locale === "ar";
  const store = await storeEnabled().catch(() => false);
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
      <style id="company-theme" dangerouslySetInnerHTML={{ __html: themeStylesheet(company.theme) }} />
      {enabled && website && !preview ? <SiteAnalytics code={config.code} /> : null}
    </head>
  );

  // A company without a public website (or one not published yet) still owns its address: show who it is
  // and how to reach it.
  if ((!enabled || !website) && !preview) {
    return (
      <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={company.theme.websiteMode}>
        {head}
        <body className={`min-h-screen bg-brand-base text-ink ${isRTL ? "font-arabic" : "font-sans"}`}>
          <WebsiteOffline company={company} locale={locale} t={t} />
        </body>
      </html>
    );
  }

  return (
    <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className={company.theme.websiteMode}>
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
        <SiteProvider site={info}>
          <FloatingScrollbar />
          <BackToTop />
          <UtmCapture />
          <SmoothScroll>
            <Navbar company={company} pages={config.pages} links={menus?.header} accountHref={store ? `/${locale}/account` : undefined} />
            <main id="main-content" className="w-full">
              {children}
            </main>
            <Footer company={company} socialLinks={socialLinks} pages={config.pages} links={menus?.footer} />
            {!preview ? <SiteCustomCode code={config.code} /> : null}
          </SmoothScroll>
          {info.whatsappButton && company.whatsapp_phone ? <WhatsAppButton phone={company.whatsapp_phone} /> : null}
        </SiteProvider>
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
      locale: locale === "ar" ? "ar_BH" : "en_US",
    },
    ...((await isWebsitePreview())
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
