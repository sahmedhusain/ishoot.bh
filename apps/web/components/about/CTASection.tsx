"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Film } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { motion } from "framer-motion";

export function CTASection() {
  const { t, locale, isRTL: ar } = useTranslation();

  return (
    <section className="relative z-10 bg-[#050807] text-[#F2F6F5] py-24 select-none border-t border-white/10 overflow-hidden">
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(9,147,127,0.3) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="shell relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative p-8 sm:p-14 rounded-3xl bg-[#0B1210] border border-[#09937F]/40 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-8 md:items-center justify-between"
        >
          {/* Ambient Corner Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#09937F]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 max-w-2xl relative z-10">
            <SectionBadge>{t("cta.badge") || (ar ? "جاهزون للبدء" : "Ready to Launch")}</SectionBadge>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              <span>{t("cta.titleLine1")}</span>{" "}
              <span className="text-[#5EEAD4] block">{t("cta.titleLine2")}</span>
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] font-sans leading-relaxed max-w-xl">
              {t("cta.description")}
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <Link
              href={`/${locale}/contact?intent=quote_request`}
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#09937F] hover:bg-[#09937F]/90 text-white font-display font-bold text-sm sm:text-base transition-all duration-300 shadow-xl shadow-[#09937F]/25 hover:shadow-[#09937F]/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{t("cta.requestTreatment") || (ar ? "ابدأ الحديث" : "Start Project")}</span>
              <ArrowUpRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

