"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  FileQuestion,
  ShieldAlert,
  RefreshCw,
  Home,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileText,
  Receipt,
  Calendar,
  CreditCard,
  Box,
  Users,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "@platform/database/constants/routes";

export interface AdminErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
  showQuickLinks?: boolean;
}

export function AdminErrorPage({
  statusCode,
  title: customTitle,
  description: customDescription,
  message: customMessage,
  error,
  reset,
  showQuickLinks,
}: AdminErrorPageProps) {
  const { t, isRTL } = useAdminLocale();
  const copy = t.errorPages;

  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const resolvedCode = String(
    statusCode ?? (error?.status || error?.statusCode || (error ? 500 : 404)),
  );

  useEffect(() => {
    if (error) {
      console.error(`[AdminErrorPage HTTP ${resolvedCode}]:`, error);
    }
  }, [error, resolvedCode]);

  const copyErrorDetails = () => {
    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        statusCode: resolvedCode,
        errorName: error?.name,
        errorMessage: customMessage || error?.message,
        digest: error?.digest,
        stack: error?.stack,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const titleKey = `code${resolvedCode}Title` as keyof typeof copy;
  const descKey = `code${resolvedCode}Desc` as keyof typeof copy;

  const resolvedTitle = customTitle || (copy[titleKey] as string) || copy.genericTitle;
  const resolvedDesc = customDescription || (copy[descKey] as string) || copy.genericDescription;
  const resolvedMessage = customMessage || error?.message || copy.unknownMessage;
  const resolvedBadge = copy.codePrefix.replace("{code}", resolvedCode);

  const is404 = resolvedCode === "404" || showQuickLinks;
  const isAuth = resolvedCode === "401" || resolvedCode === "403";

  const quickLinks = [
    { href: ROUTES.invoices.list, label: copy.invoices, icon: FileText },
    { href: ROUTES.quotations.list, label: copy.quotations, icon: Receipt },
    { href: ROUTES.moms.list, label: copy.moms, icon: Calendar },
    { href: ROUTES.payments.list, label: copy.payments, icon: CreditCard },
    { href: ROUTES.assets.list(), label: copy.assets, icon: Box },
    { href: ROUTES.directory, label: copy.directory, icon: Users },
  ];

  return (
    <main
      role="alert"
      className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 lg:p-8"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              {is404 ? (
                <FileQuestion className="h-5 w-5" />
              ) : isAuth ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  {resolvedBadge}
                </span>
                {error?.name && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {error.name}
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {resolvedTitle}
              </h1>
            </div>
          </div>
          {error?.digest && (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
              {copy.refPrefix}{error.digest}
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {resolvedDesc}
          </p>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 font-mono text-xs text-rose-600 dark:text-rose-400 break-words flex items-start gap-2">
            <Terminal className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5 text-slate-700 dark:text-slate-300">
                {copy.technicalMessageLabel}
              </span>
              <span>{resolvedMessage}</span>
            </div>
          </div>

          {is404 && (
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                {copy.quickLinksHeading}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {error?.stack && (
            <div>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <span>{copy.diagnosticsToggle}</span>
              </button>

              {showDetails && (
                <div className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {error.stack}
                  {error.digest && `\n${copy.refPrefix}${error.digest}`}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {reset && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-95 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{copy.retry}</span>
              </button>
            )}

            <Link
              href={ROUTES.home}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{copy.returnHome}</span>
            </Link>

            {error && (
              <button
                type="button"
                onClick={copyErrorDetails}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors mr-auto cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">{copy.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copy.copyDiagnostics}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
