import { normalizeTheme, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";
import { defaultWebsiteDesign, siteBaseTone } from "@platform/database/constants/website-design";
import { getSite } from "../lib/site";
import { WebUnifiedErrorPage } from "../components/shared/WebUnifiedErrorPage";

export default async function NotFound() {
  const site = await getSite().catch(() => null);
  const company = site?.company;
  const design = site?.config.design ?? defaultWebsiteDesign();
  const tone = siteBaseTone(design, design.defaultMode);

  return (
    <html lang="en" className={tone} data-site-mode={design.defaultMode} data-site-tone={tone}>
      <head>
        <style
          id="company-theme"
          dangerouslySetInnerHTML={{
            __html:
              themeStylesheet(normalizeTheme(company?.theme)) +
              websiteThemeStylesheet(normalizeTheme(company?.theme)),
          }}
        />
      </head>
      <body className="min-h-screen bg-brand-base text-ink flex items-center justify-center p-4 sm:p-6 font-sans">
        <WebUnifiedErrorPage statusCode={404} showQuickLinks={true} />
      </body>
    </html>
  );
}
