"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copyFor } from "../lib/i18n";

export interface ItUnifiedErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  diagnostics?: string;
  resolution?: string;
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
  error,
  reset,
}: ItUnifiedErrorPageProps) {
  const [showDump, setShowDump] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAr = typeof document !== "undefined" && document.documentElement.lang === "ar";
  const copy = copyFor(isAr ? "ar" : "en");
  const err = copy.errors;

  // Dynamic status code resolution
  const resolvedCode = String(
    statusCode ?? (error?.status || error?.statusCode || (error ? 500 : 404)),
  );

  useEffect(() => {
    if (error) {
      console.error(`[SAP_ITSM_DUMP] Status ${resolvedCode}:`, error);
    }
  }, [error, resolvedCode]);

  // Dynamic titles and diagnostics based on status code
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

  const resolvedTCode = err.tcodePrefix.replace("{code}", resolvedCode);
  const resolvedWindowTitle = err.windowTitleStatus.replace("{code}", resolvedCode);
  const resolvedSysId = err.clientSysIdDynamic.replace("{code}", resolvedCode);

  const copyDump = () => {
    const text = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        system: "PRD/001",
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
      className="min-h-screen bg-[#c0c0c0] text-black font-mono p-2 sm:p-4 select-none flex items-center justify-center"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-4xl border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] shadow-2xl">
        {/* Retro SAP Window Title Bar */}
        <div className="bg-[#000080] text-white px-3 py-1 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-yellow-400 text-black text-[9px] font-black inline-flex items-center justify-center">
              !
            </span>
            <span>{resolvedWindowTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-[#c0c0c0] text-black border border-white text-[10px]">_</span>
            <span className="px-1.5 py-0.5 bg-[#c0c0c0] text-black border border-white text-[10px]">□</span>
            <span className="px-1.5 py-0.5 bg-red-600 text-white border border-white text-[10px]">✕</span>
          </div>
        </div>

        {/* Menu / Command Bar */}
        <div className="bg-[#ece9d8] border-b border-[#808080] px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold">{err.transactionLabel}</span>
            <div className="border border-[#808080] bg-white px-2 py-0.5 text-xs font-bold text-red-700 tracking-wider">
              {resolvedTCode}
            </div>
            <span className="text-gray-600 text-[11px]">{err.programCore}</span>
          </div>
          <div className="text-[11px] text-gray-700">
            {resolvedSysId}
          </div>
        </div>

        {/* Main Dump Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Header Warning Strip */}
          <div className="border-2 border-red-800 bg-red-50 p-3 flex items-start gap-3">
            <div className="bg-red-700 text-white font-black px-2 py-1 text-sm shrink-0">
              {err.abapDumpBadge}
            </div>
            <div>
              <div className="font-bold text-sm text-red-900">
                {resolvedTitle}
              </div>
              <div className="text-xs text-gray-700 mt-0.5">
                {resolvedDesc}
              </div>
            </div>
          </div>

          {/* Technical Metadata Grid */}
          <div className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white p-3 text-xs space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <span className="font-bold text-gray-600">{err.errorCodeLabel}</span>{" "}
                <span className="font-bold text-red-700">{resolvedCode}</span>
              </div>
              <div>
                <span className="font-bold text-gray-600">{err.runtimeErrorLabel}</span>{" "}
                <span className="font-bold">{error?.name || resolvedCode}</span>
              </div>
              <div>
                <span className="font-bold text-gray-600">{err.dumpIdLabel}</span>{" "}
                <span className="font-bold font-mono">{error?.digest || ""}</span>
              </div>
              <div>
                <span className="font-bold text-gray-600">{err.terminationPointLabel}</span>{" "}
                <span>{err.terminationPointValue}</span>
              </div>
            </div>
          </div>

          {/* Sunken Black Terminal Box with Error Message */}
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {err.st22LogViewTitle}
            </div>
            <div className="border-2 border-t-black border-l-black border-b-white border-r-white bg-black text-[#00ff66] p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner space-y-2">
              <div>
                <span className="text-yellow-400 font-bold">{err.errorMessageHeader}</span>
                {"\n"}{resolvedMessage}
              </div>
              <div>
                <span className="text-cyan-400 font-bold">{err.diagnosticsHeader}</span> {resolvedDiagnostics}
              </div>
              <div>
                <span className="text-gray-400 font-bold">{err.resolutionHeader}</span> {resolvedResolution}
              </div>
              {error?.digest && (
                <div>
                  <span className="text-cyan-400 font-bold">{err.digestSignatureHeader}</span> {error.digest}
                </div>
              )}
            </div>
          </div>

          {/* Call Stack Section (Collapsible) */}
          {error?.stack && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowDump(!showDump)}
                className="text-xs font-bold text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showDump ? "[-]" : "[+]"}</span>
                <span>{err.callStackTitle}</span>
              </button>

              {showDump && (
                <div className="border-2 border-t-black border-l-black border-b-white border-r-white bg-[#101010] text-[#c0c0c0] p-3 text-[11px] font-mono overflow-x-auto max-h-52 whitespace-pre-wrap leading-relaxed">
                  {error.stack}
                </div>
              )}
            </div>
          )}

          {/* Standard SAP GUI Footer Actions */}
          <div className="pt-2 border-t border-[#808080] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyDump}
                className="px-3 py-1.5 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-xs font-bold hover:bg-[#e4e0d8] flex items-center gap-1.5 cursor-pointer"
              >
                <span className="bg-[#808080] text-white px-1 text-[10px]">C</span>
                <span>{copied ? err.copied : err.copyShortDump}</span>
              </button>

              {reset && (
                <button
                  type="button"
                  onClick={reset}
                  className="px-3 py-1.5 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-xs font-bold hover:bg-[#e4e0d8] flex items-center gap-1.5 cursor-pointer text-blue-900"
                >
                  <span className="bg-blue-800 text-white px-1 text-[10px]">F8</span>
                  <span>{err.f8Retry}</span>
                </button>
              )}
            </div>

            <Link
              href="/"
              className="px-3 py-1.5 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-xs font-bold hover:bg-[#e4e0d8] flex items-center gap-1.5"
            >
              <span className="bg-yellow-800 text-white px-1 text-[10px]">{err.f3Key}</span>
              <span>{err.f3Back}</span>
            </Link>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-[#ece9d8] border-t border-[#808080] px-3 py-1 flex items-center justify-between text-[11px] text-gray-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-600 inline-block"></span>
            <span>{err.statusBarReady}</span>
          </div>
          <span>{err.insPrd}</span>
        </div>
      </div>
    </main>
  );
}
