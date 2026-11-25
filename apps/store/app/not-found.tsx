import { isCompanySetupCompleted } from "@platform/database";
import { normalizeTheme, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";
import { defaultWebsiteDesign, siteBaseTone } from "@platform/database/constants/website-design";
import { getSite } from "../lib/site";
import { WebUnifiedErrorPage } from "../components/shared/WebUnifiedErrorPage";
import { SnackbarProvider } from "../components/ui/snackbar";

export default async function NotFound() {
  if (!(await isCompanySetupCompleted().catch(() => false))) {
    return (
      <html lang="en">
        <body />
      </html>
    );
  }
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
      <body className="min-h-screen bg-m3-surface text-m3-on-surface font-sans antialiased">
        <SnackbarProvider>
          <WebUnifiedErrorPage statusCode={404} showQuickLinks />
        </SnackbarProvider>
      </body>
    </html>
  );
}
