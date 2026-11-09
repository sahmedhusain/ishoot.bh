"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { useAdminLocale } from "../hooks/useAdminLocale";
import { ROUTES } from "@platform/database/constants/routes";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, locale } = useAdminLocale();
  const isAr = locale === "ar";
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Dashboard caught runtime error:", error);
  }, [error]);

  const copyErrorDetails = () => {
    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        errorName: error.name || "Error",
        errorMessage: error.message,
        digest: error.digest,
        stack: error.stack,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main
      role="alert"
      className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 lg:p-8"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  {isAr ? "رمز الخطأ: 500" : "ERROR CODE: 500"}
                </span>
                {error.name && error.name !== "Error" && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {error.name}
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {isAr ? "حدث خطأ غير متوقع أثناء المعالجة" : t.copy.errorTitle || "Application Runtime Error"}
              </h1>
            </div>
          </div>
          {error.digest && (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
              REF: {error.digest}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAr
              ? "واجه النظام استثناءً غير متوقع أثناء معالجة هذا الطلب. تم تسجيل هذا الخطأ لأغراض التدقيق الفني."
              : t.copy.errorDescription || "An unexpected exception halted the execution of this page. You can retry the operation or return to the dashboard."}
          </p>

          {/* Prominent Error Message Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 font-mono text-xs text-rose-600 dark:text-rose-400 break-words flex items-start gap-2">
            <Terminal className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5 text-slate-700 dark:text-slate-300">
                {isAr ? "رسالة الخطأ البرمجية:" : "Technical Exception Message:"}
              </span>
              <span>{error.message || (isAr ? "حدث خطأ عام غير محدد" : "Unknown runtime exception")}</span>
            </div>
          </div>

          {/* Collapsible Technical Details */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>{isAr ? "التفاصيل التقنية ومسار الاستدعاء" : "Technical Stack Trace & Diagnostics"}</span>
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed border border-slate-800">
                {error.stack || `${error.name || "Error"}: ${error.message}`}
                {error.digest && `\nDigest: ${error.digest}`}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-95 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{isAr ? "إعادة المحاولة" : t.copy.retry || "Try Again"}</span>
            </button>

            <Link
              href={ROUTES.home}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{isAr ? "العودة للوحة التحكم" : "Return to Dashboard"}</span>
            </Link>

            <button
              type="button"
              onClick={copyErrorDetails}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors mr-auto"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">{isAr ? "تم النسخ!" : "Copied!"}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{isAr ? "نسخ التفاصيل" : "Copy Diagnostics"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
