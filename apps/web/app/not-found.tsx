import Link from "next/link";
import { getTranslations } from "@ishoot/locales";

export default function NotFound() {
  const tEn = getTranslations("en");
  const tAr = getTranslations("ar");

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050807] text-[#F2F6F5] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-[#0B1210] border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#09937F]/10 border border-[#09937F]/30 text-[#09937F] flex items-center justify-center mx-auto text-2xl  font-bold">
            404
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-display">
              {tEn.common.notFoundTitle} / {tAr.common.notFoundTitle}
            </h2>
            <p className="text-sm text-[#9EADA9] leading-relaxed">
              {tEn.common.notFoundDesc}
            </p>
            <p className="text-xs text-[#9EADA9]/80 font-arabic leading-relaxed" dir="rtl">
              {tAr.common.notFoundDesc}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/en"
              className="px-4 py-2 rounded-xl bg-[#014842] hover:bg-[#014842]/90 text-white text-xs font-semibold transition-colors border border-[#09937F]/40"
            >
              Return Home (EN)
            </Link>
            <Link
              href="/ar"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10 font-arabic"
            >
              الرئيسية (العربية)
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
