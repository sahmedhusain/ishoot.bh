import { ROUTES } from "../constants/routes";
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-[#070C0A] text-[#F2F6F5] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-[#0E1714] border border-white/10 p-8 rounded-3xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[#09937F]/10 border border-[#09937F]/30 text-[#09937F] flex items-center justify-center mx-auto text-2xl font-bold font-mono">
          404
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-display">
            Page Not Found / الصفحة غير موجودة
          </h2>
          <p className="text-sm text-[#9EADA9] leading-relaxed">
            The dashboard page or document reference you requested could not be located.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={ROUTES.home}
            className="px-5 py-2.5 rounded-xl bg-[#09937F] hover:bg-[#077a68] text-white text-xs font-semibold transition-colors shadow-lg shadow-[#09937F]/20"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
