"use client";

import * as React from "react";
import { normalizeTheme, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";
import { WebUnifiedErrorPage } from "../components/shared/WebUnifiedErrorPage";
import { SnackbarProvider } from "../components/ui/snackbar";

const fallbackTheme = normalizeTheme(undefined);
const fallbackStyles = themeStylesheet(fallbackTheme) + websiteThemeStylesheet(fallbackTheme);

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [tone, setTone] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("site-mode");
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      const nextTone = stored === "dark" || (stored !== "light" && prefersDark) ? "dark" : "light";
      setTone(nextTone);
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }, []);

  return (
    <html lang="en" className={tone} data-site-mode={tone} data-site-tone={tone}>
      <head>
        <style id="fallback-m3-theme" dangerouslySetInnerHTML={{ __html: fallbackStyles }} />
      </head>
      <body className="min-h-screen bg-m3-surface text-m3-on-surface font-sans antialiased">
        <SnackbarProvider>
          <WebUnifiedErrorPage error={error} reset={reset} />
        </SnackbarProvider>
      </body>
    </html>
  );
}
