import Link from "next/link";
import { getTranslations } from "@platform/locales";
import { normalizeTheme, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";
import { getSite } from "../lib/site";
import { defaultWebsiteDesign, siteBaseTone } from "@platform/database/constants/website-design";

export default async function NotFound() {
  const site = await getSite().catch(() => null);
  const company = site?.company;
  const design = site?.config.design ?? defaultWebsiteDesign();
  const tone = siteBaseTone(design, design.defaultMode);
  const tEn = getTranslations("en");
  const tAr = getTranslations("ar");

  return (
    <html lang="en" className={tone} data-site-mode={design.defaultMode} data-site-tone={tone}>
      <head>
        <style id="company-theme" dangerouslySetInnerHTML={{ __html: themeStylesheet(normalizeTheme(company?.theme)) + websiteThemeStylesheet(normalizeTheme(company?.theme)) }} />
      </head>
      <body className="min-h-screen bg-brand-base text-ink flex items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full text-center space-y-6 bg-brand-surface border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/30 text-accent flex items-center justify-center mx-auto text-3xl font-bold font-display shadow-lg shadow-accent/10">
            404
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent font-mono text-xs font-bold uppercase tracking-wider">
              {tEn.common.errorCode404} · {tAr.common.errorCode404}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
              {tEn.common.notFoundTitle} / {tAr.common.notFoundTitle}
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
              {tEn.common.notFoundDesc}
            </p>
            <p
              className="text-xs text-ink-muted/80 font-arabic leading-relaxed max-w-sm mx-auto"
              dir="rtl"
            >
              {tAr.common.notFoundDesc}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white/50 text-center space-y-1">
            <div>{tEn.common.notFoundTechnicalMessage}</div>
            <div dir="rtl" className="font-arabic text-[11px] text-white/40">{tAr.common.notFoundTechnicalMessage}</div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/en"
              className="min-h-11 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors border border-accent/40"
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
