"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  FileQuestion,
  ShieldAlert,
  RefreshCw,
  Home,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { copyFor } from "../lib/i18n";

export interface ItUnifiedErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  diagnostics?: string;
  resolution?: string;
  branding?: {
    isSetup: boolean;
    name: string;
    iconUrl: string | null;
  };
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
}

export function ItUnifiedErrorPage({
  statusCode,
  title: customTitle,
  description: customDescription,
  message: customMessage,
  diagnostics: customDiagnostics,
  resolution: customResolution,
  branding,
  error,
  reset,
}: ItUnifiedErrorPageProps) {
  const [showDump, setShowDump] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = copyFor("en");
  const err = copy.errors;

  const resolvedCode = String(
    statusCode ?? (error?.status || error?.statusCode || (error ? 500 : 404)),
  );

  useEffect(() => {
    if (error) {
      console.error(`[ITSM_RUNTIME] Status ${resolvedCode}:`, error);
    }
  }, [error, resolvedCode]);

  const titleKey = `code${resolvedCode}Title` as keyof typeof err;
  const descKey = `code${resolvedCode}Desc` as keyof typeof err;
  const diagKey = `code${resolvedCode}Diagnostics` as keyof typeof err;
  const resolKey = `code${resolvedCode}Resolution` as keyof typeof err;

  const resolvedTitle =
    customTitle ||
    (err[titleKey] as string) ||
    err.systemExceptionDynamic.replace("{code}", resolvedCode);

  const resolvedDesc =
    customDescription ||
    (err[descKey] as string) ||
    err.exceptionDesc500;

  const resolvedMessage =
    customMessage ||
    error?.message ||
    err.unexplainedException;

  const resolvedDiagnostics =
    customDiagnostics ||
    (err[diagKey] as string) ||
    resolvedMessage;

  const resolvedResolution =
    customResolution ||
    (err[resolKey] as string) ||
    err.resolutionValue404;

  const resolvedBadge = err.statusBadge.replace("{code}", resolvedCode);

  const is404 = resolvedCode === "404";
  const isAuth = resolvedCode === "401" || resolvedCode === "403";

  const copyDump = () => {
    const text = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        environment: "Production",
        statusCode: resolvedCode,
        title: resolvedTitle,
        message: resolvedMessage,
        digest: error?.digest || "",
        stack: error?.stack || "",
      },
      null,
      2,
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main
      className="min-h-screen bg-[#f4f6f8] dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans"
      dir="ltr"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#141f32] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">

        <div className="bg-[#1a2b49] text-white px-6 py-4 flex items-center justify-between border-b border-[#243756]">
          <div className="flex items-center gap-2.5">
            {branding?.isSetup && branding.iconUrl ? (
              <img
                src={branding.iconUrl}
                alt={branding.name}
                className="size-4 rounded object-contain shrink-0"
              />
            ) : null}
            <span className="text-white font-semibold text-xs tracking-tight">
              {branding?.name || copy.app.name}
            </span>
            <span className="h-3 w-px bg-white/20 mx-1" />
            <span className="text-xs text-slate-300 font-medium">
              {copy.app.operations}
            </span>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/15">
            {resolvedBadge}
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                is404
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : isAuth
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              {is404 ? (
                <FileQuestion className="size-6" />
              ) : isAuth ? (
                <ShieldAlert className="size-6" />
              ) : (
                <AlertCircle className="size-6" />
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {resolvedTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {resolvedDesc}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-sans font-semibold text-[11px] uppercase tracking-wider">
              <Terminal className="size-3.5 text-slate-500" />
              <span>{err.st22LogViewTitle}</span>
            </div>
            <div className="text-rose-600 dark:text-rose-400 font-semibold break-words">
              {resolvedMessage}
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{err.diagnosticsLabel}</span> {resolvedDiagnostics}
            </div>
            {error?.digest && (
              <div className="text-[11px] text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{err.digestLabel}</span> {error.digest}
              </div>
            )}
          </div>

          {error?.stack && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDump(!showDump)}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showDump ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                <span>{err.callStackTitle}</span>
              </button>

              {showDump && (
                <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Home className="size-3.5" />
                <span>{err.home}</span>
              </Link>

              {reset && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>{err.f8Retry}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={copyDump}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">{err.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>{err.copyShortDump}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
