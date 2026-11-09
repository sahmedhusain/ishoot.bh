"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ItErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDump, setShowDump] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[SAP_ITSM_DUMP] Critical exception in IT Portal:", error);
  }, [error]);

  const copyDump = () => {
    const text = `=== SAP GUI / ORACLE ENTERPRISE SHORT DUMP ===\nTimestamp: ${new Date().toISOString()}\nSystem: PRD/001\nError Code: 500\nError Name: ${error.name || "SYSTEM_FAILURE"}\nMessage: ${error.message}\nDigest: ${error.digest || "NONE"}\nStack Trace:\n${error.stack || "N/A"}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#c0c0c0] text-black font-mono p-2 sm:p-4 select-none">
      <div className="max-w-4xl mx-auto border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] shadow-2xl">
        {/* Retro SAP Window Title Bar */}
        <div className="bg-[#000080] text-white px-3 py-1 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-yellow-400 text-black text-[9px] font-black inline-flex items-center justify-center">
              !
            </span>
            <span>SAP GUI / ORACLE TERMINAL - [PRD/001] SYSTEM SHORT DUMP</span>
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
            <span className="font-bold">Transaction:</span>
            <div className="border border-[#808080] bg-white px-2 py-0.5 text-xs font-bold text-red-700 tracking-wider">
              /nERR_500
            </div>
            <span className="text-gray-600 text-[11px]">Program: SAP_ITSM_CORE</span>
          </div>
          <div className="text-[11px] text-gray-700">
            Client: 001 | SysID: PRD | User: IT_ADMIN
          </div>
        </div>

        {/* Main Dump Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Header Warning Strip */}
          <div className="border-2 border-red-800 bg-red-50 p-3 flex items-start gap-3">
            <div className="bg-red-700 text-white font-black px-2 py-1 text-sm shrink-0">
              ABAP / TERMINAL DUMP
            </div>
            <div>
              <div className="font-bold text-sm text-red-900">
                CRITICAL SYSTEM EXCEPTION: TRANSACTION TERMINATED (CODE: 500)
              </div>
              <div className="text-xs text-gray-700 mt-0.5">
                The execution was halted due to an uncaught runtime exception in the subsystem router.
              </div>
            </div>
          </div>

          {/* Technical Metadata Grid */}
          <div className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white p-3 text-xs space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="font-bold text-gray-600">Error Code:</span> <span className="font-bold text-red-700">HTTP 500 / INTERNAL_SERVER_ERROR</span></div>
              <div><span className="font-bold text-gray-600">Runtime Error:</span> <span className="font-bold">{error.name || "SYSTEM_FAILURE"}</span></div>
              <div><span className="font-bold text-gray-600">Dump ID:</span> <span className="font-bold font-mono">{error.digest || "DUMP_LIVE_" + Date.now().toString(16)}</span></div>
              <div><span className="font-bold text-gray-600">Termination Point:</span> <span>router.exec() at pipeline:0</span></div>
            </div>
          </div>

          {/* Sunken Black Terminal Box with Error Message */}
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Error Message & Analysis (ST22 Log View):
            </div>
            <div className="border-2 border-t-black border-l-black border-b-white border-r-white bg-black text-[#00ff66] p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              <span className="text-yellow-400 font-bold">&gt;&gt;&gt; ERROR MESSAGE:</span>
              {"\n"}{error.message || "An unexplained exception stopped the transaction."}
              {error.digest && (
                <>
                  {"\n\n"}
                  <span className="text-cyan-400">&gt;&gt;&gt; DIGEST SIGNATURE:</span> {error.digest}
                </>
              )}
            </div>
          </div>

          {/* Expandable ABAP Call Stack */}
          <div>
            <button
              type="button"
              onClick={() => setShowDump(!showDump)}
              className="text-xs font-bold text-blue-800 underline hover:text-blue-900 cursor-pointer"
            >
              {showDump ? "[-] Hide Full System Stack Trace" : "[+] View Full System Stack Trace & Symbol Table"}
            </button>

            {showDump && (
              <div className="mt-2 border-2 border-t-black border-l-black border-b-white border-r-white bg-[#1a1a1a] text-gray-300 p-3 text-[11px] font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                {error.stack || "No additional symbolic stack trace recorded."}
              </div>
            )}
          </div>

          {/* Retro SAP Function Buttons Toolbar (F-Keys) */}
          <div className="pt-3 border-t border-[#808080] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1.5 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-xs font-bold hover:bg-[#e4e0d8] flex items-center gap-1 cursor-pointer"
              >
                <span className="bg-blue-800 text-white px-1 text-[10px]">F8</span>
                <span>Retry Transaction</span>
              </button>

              <Link
                href="/"
                className="px-3 py-1.5 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-xs font-bold hover:bg-[#e4e0d8] flex items-center gap-1 cursor-pointer"
              >
                <span className="bg-yellow-800 text-white px-1 text-[10px]">F3</span>
                <span>Back to Overview</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={copyDump}
              className="px-2.5 py-1 border border-gray-600 bg-[#e4e0d8] text-xs font-bold hover:bg-white cursor-pointer"
            >
              {copied ? "✓ Copied Dump" : "Copy Diagnostic Dump"}
            </button>
          </div>
        </div>

        {/* Retro Status Bar at bottom */}
        <div className="bg-[#ece9d8] border-t border-[#808080] px-3 py-1 flex items-center justify-between text-[11px] text-gray-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-600 inline-block"></span>
            <span>SYSTEM_FAILURE · Check system log ST22</span>
          </div>
          <span>INS | PRD_SRV01</span>
        </div>
      </div>
    </main>
  );
}
