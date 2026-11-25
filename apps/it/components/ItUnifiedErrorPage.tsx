"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  Flag,
  Home,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { copyFor } from "../lib/i18n";

export interface ItUnifiedErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  branding?: {
    isSetup: boolean;
    name: string;
    iconUrl: string | null;
  };
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
}

interface ReportResult {
  ticketId: string;
  ticketNumber: number;
  incidentId: string;
}

function makeIncidentId(code: string): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `IT-${code}-${day}-${rand}`;
}

export function ItUnifiedErrorPage({
  statusCode,
  title: customTitle,
  description: customDescription,
  branding,
  error,
  reset,
}: ItUnifiedErrorPageProps) {
  const copy = copyFor("en");
  const err = copy.errors;

  const resolvedNumber = Number(
    statusCode ?? error?.status ?? error?.statusCode ?? (error ? 500 : 404),
  );
  const resolvedCode = Number.isFinite(resolvedNumber)
    ? String(Math.trunc(resolvedNumber))
    : "500";
  const errorCode = `ERR-IT-${resolvedCode}`;

  const [incidentId, setIncidentId] = React.useState(`IT-${resolvedCode}-PENDING`);
  const [reporting, setReporting] = React.useState(false);
  const [reportResult, setReportResult] = React.useState<ReportResult | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIncidentId(makeIncidentId(resolvedCode));
  }, [resolvedCode]);

  React.useEffect(() => {
    if (error) {
      console.error(`[ITSM_RUNTIME] Status ${resolvedCode}:`, error);
    }
  }, [error, resolvedCode]);

  const is404 = resolvedCode === "404";
  const isAuth = resolvedCode === "401" || resolvedCode === "403";

  const resolvedTitle =
    customTitle ||
    (is404
      ? err.friendly404Title
      : isAuth
        ? err.friendly403Title
        : resolvedCode.startsWith("5")
          ? err.friendly500Title
          : err.friendlyGenericTitle.replace("{code}", resolvedCode));

  const resolvedDesc =
    customDescription ||
    (is404
      ? err.friendly404Desc
      : isAuth
        ? err.friendly403Desc
        : resolvedCode.startsWith("5")
          ? err.friendly500Desc
          : err.friendlyGenericDesc);

  const handleReport = async () => {
    if (reporting || reportResult) return;
    setReporting(true);
    setReportError(null);
    try {
      const route = typeof window !== "undefined" ? window.location.pathname : "/";
      const url = typeof window !== "undefined" ? window.location.href : route;
      const clientMeta =
        typeof window !== "undefined"
          ? {
              viewport: `${window.innerWidth}x${window.innerHeight}`,
              language: navigator.language || "en",
              platform: navigator.platform || "unknown",
              referrer: document.referrer || "",
            }
          : undefined;

      const response = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCode,
          incidentId,
          statusCode: Number(resolvedCode) || 500,
          route,
          url,
          timestamp: new Date().toISOString(),
          message: error?.message || resolvedTitle,
          stack: error?.stack || "",
          digest: error?.digest || "",
          clientMeta,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; ticketId?: string; ticketNumber?: number; incidentId?: string }
        | null;

      if (!response.ok || !data?.ok || !data.ticketId) {
        setReportError(err.reportFailed);
        return;
      }

      setReportResult({
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber ?? 0,
        incidentId: data.incidentId || incidentId,
      });
    } catch {
      setReportError(err.reportFailed);
    } finally {
      setReporting(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[#f4f6f8] dark:bg-[#0b1320] text-[#1e293b] dark:text-[#f1f5f9] flex items-center justify-center p-4 sm:p-6 font-sans"
      dir="ltr"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#141f32] border border-[#e2e8f0] dark:border-[#1e2d42] rounded-lg shadow-lg overflow-hidden">
        <div className="bg-[#1a2b49] dark:bg-[#0b1526] text-white px-5 py-3.5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            {branding?.isSetup && branding.iconUrl ? (
              <img
                src={branding.iconUrl}
                alt={branding.name}
                className="size-4 rounded object-contain shrink-0"
              />
            ) : null}
            <span className="text-white font-semibold text-xs tracking-tight truncate">
              {branding?.name || copy.app.name}
            </span>
            <span className="h-3.5 w-px bg-white/20 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">
              {copy.app.operations}
            </span>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-200 border border-white/15 shrink-0">
            HTTP {resolvedCode}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div
              className={`p-2.5 rounded-lg shrink-0 border ${
                is404
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                  : isAuth
                    ? "bg-sky-500/10 text-[#0070d2] dark:text-sky-400 border-sky-500/25"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
              }`}
            >
              {is404 ? (
                <FileQuestion className="size-5" aria-hidden />
              ) : isAuth ? (
                <ShieldAlert className="size-5" aria-hidden />
              ) : (
                <AlertCircle className="size-5" aria-hidden />
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {resolvedTitle}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {resolvedDesc}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-[#e2e8f0] dark:border-[#1e2d42] bg-[#f8fafc] dark:bg-[#0b1320]/70 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {err.errorCodeLabel}
              </div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {errorCode}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {err.incidentIdLabel}
              </div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                {incidentId}
              </div>
            </div>
          </div>

          {reportResult && (
            <div
              role="status"
              className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs space-y-1"
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <span>
                  {err.reportedTitle.replace(
                    "{number}",
                    reportResult.ticketNumber ? `#${reportResult.ticketNumber}` : reportResult.incidentId,
                  )}
                </span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-200/90 ps-6">
                {err.reportedDesc}{" "}
                <Link
                  href={`/tickets/${reportResult.ticketId}`}
                  className="font-semibold underline hover:no-underline"
                >
                  {err.viewTicket}
                </Link>
              </p>
            </div>
          )}

          {reportError && (
            <div
              role="alert"
              className="rounded-md border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              {reportError}
            </div>
          )}

          <div className="pt-3 border-t border-[#e2e8f0] dark:border-[#1e2d42] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1b2942] hover:bg-[#f8fafc] dark:hover:bg-[#243756] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Home className="size-3.5" aria-hidden />
                <span>{err.home}</span>
              </Link>

              {reset && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1b2942] hover:bg-[#f8fafc] dark:hover:bg-[#243756] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  <span>{err.retryBtn}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleReport}
              disabled={reporting || Boolean(reportResult)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0070d2] hover:bg-[#005fb2] dark:bg-[#0284c7] dark:hover:bg-[#0369a1] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reporting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Flag className="size-3.5" aria-hidden />
              )}
              <span>{reporting ? err.reportingBtn : err.reportBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
