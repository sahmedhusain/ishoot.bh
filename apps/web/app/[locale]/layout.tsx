import { getPublicCompanySettings } from "../../lib/company";
// Database content must not be frozen into empty pages when the build database is unavailable.
export const dynamic = "force-dynamic";
import * as React from "react";
import { notFound } from "next/navigation";
import { locales, Locale, isValidLocale } from "../../lib/i18n";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { BackToTop } from "../../components/layout/BackToTop";
import {  getSocialLinks } from "@ishoot/database";

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

  const [isRTL, company, socialLinks] = await Promise.all([
    Promise.resolve(locale === "ar"),
    getPublicCompanySettings(),
    getSocialLinks(),
  ]);

  return (
    <html dir={isRTL ? "rtl" : "ltr"} lang={locale}>
      <body
        className={`min-h-screen bg-[#050807] text-[#F2F6F5] selection:bg-[#09937F]/40 selection:text-white ${isRTL ? "font-arabic" : "font-sans"}`}
      >
        <FloatingScrollbar />
        <BackToTop />
        <SmoothScroll>
          <Navbar company={company} />
          <main className="w-full">{children}</main>
          <Footer company={company} socialLinks={socialLinks} />
        </SmoothScroll>
      </body>
    </html>
  );
}
