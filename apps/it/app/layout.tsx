import type { Metadata } from "next";
import { Toaster } from "sonner";
import {
  googleFontsHref,
  normalizeTheme,
  themeStylesheet,
} from "@platform/database/constants/theme";
import { ConfirmationProvider } from "@platform/ui";
// The IT dashboard shares the admin's design system so both dashboards look and behave the same.
import "../../admin/app/globals.css";
import "../../admin/app/admin-design.css";
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
        <script
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
      <body className="min-h-screen bg-surface text-ink antialiased font-sans">
        <CopyProvider copy={copyFor(locale)} locale={locale}>
          <ConfirmationProvider>{children}</ConfirmationProvider>
          <Toaster richColors closeButton position="top-right" />
        </CopyProvider>
      </body>
    </html>
  );
}
