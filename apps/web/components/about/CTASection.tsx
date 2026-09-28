"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, MessageSquare, Sparkles } from "lucide-react";
import initialCompanyConfig from "@ishoot/database/config";

export function CTASection() {
  const { t, locale } = useTranslation();
  const company = initialCompanyConfig.company;

  return (
    <section
      id="contact-cta"
      className="katana-top relative z-10 bg-[#070C0A] text-[#F2F6F5] select-none pt-[clamp(6rem,12vh,10rem)] pb-24 border-t border-white/5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(9,147,127,0.25) 0%, rgba(1,72,66,0.10) 40%, transparent 70%)",
        }}
      />

      <div className="shell relative z-20 text-center space-y-10 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-[#5EEAD4]">
          <Sparkles className="w-3.5 h-3.5 text-[#09937F]" />
          <span>{t("cta.badge")}</span>
        </div>

        <h2 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] tracking-tight font-bold text-white">
          {t("cta.titleLine1")} <br />
          <span className="text-emerald-shine">{t("cta.titleLine2")}</span>
        </h2>

        <p className="text-base sm:text-xl text-[#9EADA9] max-w-2xl mx-auto leading-relaxed font-sans">
          {t("cta.description")}
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`https://wa.me/${company.whatsappPhone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black hover:border-emerald-500 py-3 ps-6 pe-3 text-xs sm:text-sm font-bold text-emerald-400 transition-all shadow-xl"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 group-hover:text-black transition-colors" />
            <span>{t("cta.whatsapp")}</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/20 group-hover:bg-black group-hover:text-emerald-400 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </a>

          <Link
            href={`/${locale}/contact`}
            className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white text-black py-3 ps-6 pe-3 text-xs sm:text-sm font-bold hover:bg-[#09937F] hover:text-white hover:border-[#09937F] transition-all shadow-2xl"
          >
            <span>{t("cta.requestTreatment")}</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-black text-white group-hover:bg-white group-hover:text-[#014842] transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        <div className="pt-12 text-xs font-mono text-[#9EADA9]/70 space-y-1">
          <div>{t("cta.address")}</div>
          <div className="text-[10px] text-[#09937F]">
            © {new Date().getFullYear()} {t("footer.companyName")}.{" "}
            {t("cta.rights")}
          </div>
        </div>
      </div>
    </section>
  );
}
