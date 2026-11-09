"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  const [showStack, setShowStack] = useState(false);

  useEffect(() => {
    console.error("Web client caught runtime exception:", error);
  }, [error]);

  return (
    <main
      role="alert"
      className="min-h-[80vh] flex items-center justify-center p-6 bg-brand-base text-ink"
    >
      <div className="max-w-xl w-full text-center space-y-6 bg-brand-surface/90 border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
        {/* Error Code & Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-lg">
          <AlertCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <span>ERROR CODE: 500</span>
            {error.name && error.name !== "Error" && <span>· {error.name}</span>}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
            {t("common.errorTitle") || "Studio Pipeline Exception"}
          </h1>

          <p className="text-sm text-ink-muted leading-relaxed max-w-md mx-auto">
            {t("common.errorDescription") || "Our production engine encountered an unexpected runtime exception. Details have been captured."}
          </p>
        </div>

        {/* Technical Error Message Box */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-left font-mono text-xs text-rose-300 break-words space-y-1.5 shadow-inner">
          <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-wider font-sans font-semibold">
            <Terminal className="w-3.5 h-3.5 text-rose-400" />
            <span>Exception Message:</span>
          </div>
          <div className="text-rose-400 font-semibold pl-1">
            {error.message || "An unhandled execution error occurred."}
          </div>
          {error.digest && (
            <div className="text-[11px] text-white/40 pt-1 border-t border-white/5 pl-1">
              Digest Reference: {error.digest}
            </div>
          )}
        </div>

        {/* Collapsible Stack Trace */}
        {error.stack && (
          <div className="text-left">
            <button
              type="button"
              onClick={() => setShowStack(!showStack)}
              className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors mx-auto cursor-pointer"
            >
              {showStack ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showStack ? "Hide Technical Diagnostics" : "Show Technical Diagnostics"}</span>
            </button>

            {showStack && (
              <pre className="mt-2 p-3 rounded-xl bg-black/80 border border-white/10 text-white/60 font-mono text-[10px] overflow-x-auto max-h-40 whitespace-pre-wrap leading-relaxed">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {/* Recovery Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all border border-accent/40 active:scale-95 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("common.retry") || "Retry Operation"}</span>
          </button>

          <Link
            href="/"
            className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t("common.returnHome") || "Return to Homepage"}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
