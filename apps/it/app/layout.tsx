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
import { copyFor, getLocale } from "../lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const copy = copyFor(await getLocale());
  return { title: copy.app.name, robots: { index: false, follow: false } };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  // The default company theme; the theme moves to the system service with the settings pages (Phase 4).
  const theme = normalizeTheme(undefined);
  const fontsHref = googleFontsHref(theme);
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
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
      <body className="it-app-body min-h-screen antialiased">
        <CopyProvider copy={copyFor(locale)} locale={locale}>
          <CurrencyLocaleProvider value={locale}>
            <ConfirmationProvider>{children}</ConfirmationProvider>
            <Toaster richColors closeButton position="top-right" />
          </CurrencyLocaleProvider>
        </CopyProvider>
      </body>
    </html>
  );
}
