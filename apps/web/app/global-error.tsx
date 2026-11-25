"use client";

import "./globals.css";
import { WebUnifiedErrorPage } from "../components/shared/WebUnifiedErrorPage";
import { SnackbarProvider } from "@platform/ui";
import { FALLBACK_M3_CSS } from "../lib/m3-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style id="m3-global-error-fallback" dangerouslySetInnerHTML={{ __html: FALLBACK_M3_CSS }} />
      </head>
      <body className="min-h-screen bg-m3-surface text-m3-on-surface font-sans antialiased">
        <SnackbarProvider>
          <WebUnifiedErrorPage statusCode={500} error={error} reset={reset} />
        </SnackbarProvider>
      </body>
    </html>
  );
}
