import Link from "next/link";
import { getTranslations } from "@platform/locales";
import { normalizeTheme, themeStylesheet } from "@platform/database/constants/theme";
import { getPublicCompanySettings } from "../lib/company";

export default async function NotFound() {
  const company = await getPublicCompanySettings().catch(() => null);
  const tEn = getTranslations("en");
  const tAr = getTranslations("ar");

  return (
    <html lang="en" className="dark">
      <head>
        <style id="company-theme" dangerouslySetInnerHTML={{ __html: themeStylesheet(normalizeTheme(company?.theme)) }} />
      </head>
      <body className="min-h-screen bg-brand-base text-ink flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-brand-surface border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl  font-bold">
            404
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-display">
              {tEn.common.notFoundTitle} / {tAr.common.notFoundTitle}
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              {tEn.common.notFoundDesc}
            </p>
            <p
              className="text-xs text-ink-muted/80 font-arabic leading-relaxed"
              dir="rtl"
            >
              {tAr.common.notFoundDesc}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/en"
              className="min-h-11 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-paper text-xs font-semibold transition-colors border border-accent/40"
            >
              {tEn.common.returnHomeEnglish}
            </Link>
            <Link
              href="/ar"
              className="min-h-11 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10 font-arabic"
            >
              {tAr.common.returnHome}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
