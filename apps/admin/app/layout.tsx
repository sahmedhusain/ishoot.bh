import { cookies } from "next/headers";
import Script from "next/script";
import { getAdminTranslations, isLocale, isRtlLocale } from "@platform/locales";
import "./globals.css";
import "./admin-design.css";
import "./page-regions.css";
import { appearanceBootstrapScript } from "../lib/admin-appearance";
import { OverlayScrollbarsProvider, ConfirmationProvider, PhoneCountryProvider, CompanyCurrencyProvider } from "@platform/ui";
import {
  googleFontsHref,
  normalizeTheme,
  themeStylesheet,
} from "@platform/database/constants/theme";
import { companyMetadata } from "../lib/company-metadata";
import { getCachedCompanySettings } from "../lib/cached-queries";
import { AdminLocaleProvider } from "../hooks/useAdminLocale";
import { AdminThemeProvider } from "../hooks/useAdminTheme";
import { UnsavedChangesProvider } from "../hooks/useUnsavedChanges";
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
  const savedLocale = (await cookies()).get("platform_admin_locale")?.value;
  const initialLocale = isLocale(savedLocale) ? savedLocale : company?.primary_language ?? "ar";
  const initialTranslations = getAdminTranslations(initialLocale, company?.business_activity);
  const theme = normalizeTheme(company?.theme);
  const fontsHref = googleFontsHref(theme);
  return (
    <html
      lang={initialLocale}
      dir={isRtlLocale(initialLocale) ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={theme.defaultMode === "light" ? "light" : "dark"}
    >
      <head>
        <Script
          id="admin-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: appearanceBootstrapScript() + `try{var m=localStorage.getItem("platform_admin_theme");if(!["light","dark","system"].includes(m))m=${JSON.stringify(theme.defaultMode)};var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d)}catch{}`,
          }}
        />
        {fontsHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin=""
            />
            <link rel="stylesheet" href={fontsHref} />
          </>
        ) : null}
        <style
          id="company-theme"
          dangerouslySetInnerHTML={{ __html: themeStylesheet(theme) }}
        />
      </head>
      <body data-admin-app className="min-h-screen bg-surface text-ink antialiased font-sans selection:bg-secondary-container selection:text-on-secondary-container transition-colors duration-base ease-standard">
        <AdminThemeProvider defaultTheme={theme.defaultMode}>
          <AdminLocaleProvider activity={company?.business_activity} initialLocale={initialLocale} initialTranslations={initialTranslations}>
            <CompanyCurrencyProvider currency={company?.default_currency}><PhoneCountryProvider country={company?.country}><ConfirmationProvider>
              <UnsavedChangesProvider><OverlayScrollbarsProvider />{children}</UnsavedChangesProvider>
            </ConfirmationProvider></PhoneCountryProvider></CompanyCurrencyProvider>
            <Toaster richColors closeButton position="top-right" />
          </AdminLocaleProvider>
        </AdminThemeProvider>
      </body>
    </html>
  );
}
