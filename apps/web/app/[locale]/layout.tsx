
import * as React from 'react';
import { notFound } from 'next/navigation';
import { locales, Locale, isValidLocale } from '../../lib/i18n';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SmoothScroll } from '../../components/layout/SmoothScroll';

import { CinematicPreloader } from '../../components/layout/CinematicPreloader';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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

  const isRTL = locale === 'ar';

  return (
    <html dir={isRTL ? 'rtl' : 'ltr'} lang={locale}>
      <body className={`min-h-screen bg-[#050807] text-[#F2F6F5] selection:bg-[#09937F]/40 selection:text-white ${isRTL ? 'font-arabic' : 'font-sans'}`}>
        <CinematicPreloader isRTL={isRTL} />
        <SmoothScroll>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
