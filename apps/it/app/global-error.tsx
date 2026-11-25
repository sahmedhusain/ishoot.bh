"use client";

import { ItUnifiedErrorPage } from "../components/ItUnifiedErrorPage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number; statusCode?: number };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr">
      <body className="it-app-body min-h-screen antialiased bg-[#f4f6f8] dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 font-sans">
        <ItUnifiedErrorPage statusCode={500} error={error} reset={reset} />
      </body>
    </html>
  );
}
