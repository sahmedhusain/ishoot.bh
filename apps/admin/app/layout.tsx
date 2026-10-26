import "./globals.css";
import { ConfirmationProvider } from "@platform/ui";
import { googleFontsHref, normalizeTheme, themeStylesheet } from "@platform/database/constants/theme";
import { companyMetadata } from "../lib/company-metadata";
import { getCachedCompanySettings } from "../lib/cached-queries";
import { AdminLocaleProvider } from "../hooks/useAdminLocale";
import { AdminThemeProvider } from "../hooks/useAdminTheme";
import { Toaster } from "sonner";

export const generateMetadata = () => companyMetadata();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The company theme (colours, fonts, radius) becomes CSS variables; the default theme is used if the
  // database is unreachable so the error and login pages still render.
  const company = await getCachedCompanySettings().catch(() => null);
  const theme = normalizeTheme(company?.theme);
  const fontsHref = googleFontsHref(theme);
  return (
    <html lang="ar" dir="rtl" className={theme.defaultMode === "light" ? "light" : "dark"}>
      <head>
        {fontsHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fontsHref} />
          </>
        ) : null}
        <style id="company-theme" dangerouslySetInnerHTML={{ __html: themeStylesheet(theme) }} />
      </head>
      <body className="min-h-screen bg-brand-base text-slate-800 dark:text-ink antialiased font-sans selection:bg-accent/30 selection:text-white transition-colors duration-200">
        <AdminThemeProvider defaultTheme={theme.defaultMode}>
          <AdminLocaleProvider activity={company?.business_activity}>
            <ConfirmationProvider>{children}</ConfirmationProvider>
            <Toaster richColors closeButton position="top-right" />
          </AdminLocaleProvider>
        </AdminThemeProvider>
      </body>
    </html>
  );
}
