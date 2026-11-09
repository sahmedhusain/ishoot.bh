import Link from "next/link";
import { copyFor, getLocale } from "../lib/i18n";

export default async function NotFound() {
  const locale = await getLocale();
  const copy = copyFor(locale);
  const isAr = locale === "ar";

  return (
    <main className="min-h-screen bg-[#c0c0c0] text-black font-mono p-2 sm:p-4 select-none flex items-center justify-center">
      <div className="w-full max-w-2xl border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] shadow-2xl">
        {/* Retro Title Bar */}
        <div className="bg-[#000080] text-white px-3 py-1 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-yellow-400 text-black text-[9px] font-black inline-flex items-center justify-center">
              ?
            </span>
            <span>SAP GUI / ORACLE TERMINAL - [PRD/001] OBJECT NOT FOUND</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-[#c0c0c0] text-black border border-white text-[10px]">_</span>
            <span className="px-1.5 py-0.5 bg-[#c0c0c0] text-black border border-white text-[10px]">□</span>
            <span className="px-1.5 py-0.5 bg-red-600 text-white border border-white text-[10px]">✕</span>
          </div>
        </div>

        {/* Command Bar */}
        <div className="bg-[#ece9d8] border-b border-[#808080] px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold">Transaction:</span>
            <div className="border border-[#808080] bg-white px-2 py-0.5 text-xs font-bold text-amber-700 tracking-wider">
              /nNOT_FOUND_404
            </div>
            <span className="text-gray-600 text-[11px]">Program: SAP_ITSM_DISPATCH</span>
          </div>
          <div className="text-[11px] text-gray-700">
            Client: 001 | SysID: PRD | Status: 404
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="border-2 border-amber-700 bg-amber-50 p-3 flex items-start gap-3">
            <div className="bg-amber-600 text-white font-black px-2 py-1 text-sm shrink-0">
              404
            </div>
            <div>
              <div className="font-bold text-sm text-amber-900">
                {isAr ? "الكائن أو المسار المطلوب غير موجود في النظام (رمز: 404)" : "OBJECT OR ROUTE NOT FOUND IN CLIENT 001 (CODE: 404)"}
              </div>
              <div className="text-xs text-gray-700 mt-0.5">
                {isAr ? copy.errors.notFound : "The requested transaction code or target record does not exist or has been relocated."}
              </div>
            </div>
          </div>

          {/* Terminal Console Box */}
          <div className="border-2 border-t-black border-l-black border-b-white border-r-white bg-black text-[#00ff66] p-4 text-xs font-mono space-y-2">
            <div><span className="text-yellow-400 font-bold">&gt;&gt;&gt; SYSTEM MESSAGE:</span> E-0404-NO_RECORD_FOUND</div>
            <div><span className="text-cyan-400">&gt;&gt;&gt; DIAGNOSTICS:</span> The requested URL could not be resolved by the system directory router.</div>
            <div><span className="text-gray-400">&gt;&gt;&gt; RESOLUTION:</span> Use transaction /n to return to root navigation or check authorization role.</div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#808080] flex items-center justify-between gap-3">
            <Link
              href="/"
              className="px-4 py-2 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#d4d0c8] active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-xs font-bold hover:bg-[#e4e0d8] flex items-center gap-1.5"
            >
              <span className="bg-yellow-800 text-white px-1 text-[10px]">F3</span>
              <span>{isAr ? copy.errors.home : "Back to Main Menu (/)"}</span>
            </Link>

            <span className="text-xs text-gray-600">
              Server: ishoot-prd-01
            </span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-[#ece9d8] border-t border-[#808080] px-3 py-1 flex items-center justify-between text-[11px] text-gray-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-yellow-500 inline-block"></span>
            <span>OBJECT_NOT_FOUND · Check transaction catalog</span>
          </div>
          <span>INS | PRD_001</span>
        </div>
      </div>
    </main>
  );
}
