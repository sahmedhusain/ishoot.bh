import { isWebsitePreview,getWebsite } from "../../lib/website";
import { getPublicCompanySettings } from "../../lib/company";
import * as React from "react";
import { getTranslations, formatMessage } from "@platform/locales";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { BackToTop } from "../../components/layout/BackToTop";
import { getSocialLinks } from "@platform/database";
import { googleFontsHref, themeStylesheet } from "@platform/database/constants/theme";
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

  const [isRTL, company, socialLinks, website] = await Promise.all([
    Promise.resolve(locale === "ar"),
    getPublicCompanySettings(),
    getSocialLinks(),
    getWebsite().catch(() => null),
  ]);

  const preview = await isWebsitePreview();
  const t = getTranslations(locale);
  const fontsHref = googleFontsHref(company.theme);

  return (
    <html dir={isRTL ? "rtl" : "ltr"} lang={locale} className="dark">
      <head>
        {fontsHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fontsHref} />
          </>
        ) : null}
        <style id="company-theme" dangerouslySetInnerHTML={{ __html: themeStylesheet(company.theme) }} />
      </head>
      <body
        className={`min-h-screen bg-brand-base text-ink selection:bg-accent/40 selection:text-white ${isRTL ? "font-arabic" : "font-sans"}`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-white focus:text-black focus:p-3"
        >
          {t.common.skipContent}
        </a>
        {preview && (
          <div className="fixed bottom-4 start-4 z-[100] bg-amber-100 text-amber-950 p-3 rounded-lg shadow-lg flex gap-4 items-center text-sm">
            <span>{t.common.preview}</span>
            <form method="post" action="/api/preview">
              <button className="underline">{t.common.exitPreview}</button>
            </form>
          </div>
        )}
        <FloatingScrollbar />
        <BackToTop />
        <SmoothScroll>
          <Navbar company={company} pages={website?.config?.pages} />
          <main id="main-content" className="w-full">
            {children}
          </main>
          <Footer
            company={company}
            socialLinks={socialLinks}
            pages={website?.config?.pages}
          />
        </SmoothScroll>
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
  const { seo } = getTranslations(locale);
  const company = await getPublicCompanySettings();
  const title = formatMessage(seo.title, { companyName: locale === "ar" ? company.company_name_ar : company.company_name_en });
  return {
    title,
    description: seo.description,
    openGraph: {
      title,
      description: seo.description,
      locale: locale === "ar" ? "ar_BH" : "en_US",
    },
    ...((await isWebsitePreview())
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
