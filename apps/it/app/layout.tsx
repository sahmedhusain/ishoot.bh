import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import {
  googleFontsHref,
  normalizeTheme,
  themeStylesheet,
} from "@platform/config/constants/theme";
import { ConfirmationProvider, CurrencyLocaleProvider } from "@platform/ui";
import "./globals.css";
import "./it-design.css";
import { CopyProvider } from "../components/CopyProvider";
import { copyFor } from "../lib/i18n";
import { getCompanyBranding } from "../lib/company-branding";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getCompanyBranding();
  return {
    title: branding.name,
    icons: branding.iconUrl ? [{ url: branding.iconUrl }] : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = normalizeTheme(undefined);
  const fontsHref = googleFontsHref(theme);
  const copy = copyFor("en");

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={theme.defaultMode === "dark" ? "dark" : "light"}
    >
      <head>
        <Script
          id="it-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem("platform_it_theme");if(!["light","dark","system"].includes(m))m=${JSON.stringify(theme.defaultMode)};var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d)}catch{}`,
          }}
        />
        {fontsHref ? <link rel="stylesheet" href={fontsHref} /> : null}
        <style
          id="company-theme"
          dangerouslySetInnerHTML={{ __html: themeStylesheet(theme) }}
        />
      </head>
      <body className="it-app-body min-h-screen antialiased bg-[#f4f6f8] dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 font-sans">
        <CopyProvider copy={copy} locale="en">
          <CurrencyLocaleProvider value="en">
            <ConfirmationProvider>{children}</ConfirmationProvider>
            <Toaster richColors closeButton position="top-right" />
          </CurrencyLocaleProvider>
        </CopyProvider>
      </body>
    </html>
  );
}
