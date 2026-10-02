"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { Quote, Sparkles, Camera, Award, ShieldCheck, Film, Aperture } from "lucide-react";
import { motion } from "framer-motion";

interface CEOHeroProps {
  company?: CompanySettings;
}

export function CEOHero({ company }: CEOHeroProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  const ceoTitle = (isAr ? company?.ceo_title_ar : company?.ceo_title_en) || t("about.ceoTitle");
  const ceoName = (isAr ? company?.ceo_name_ar : company?.ceo_name_en) || t("about.ceoName");
  const ceoQuote = (isAr ? company?.ceo_quote_ar : company?.ceo_quote_en) || t("about.ceoQuote");
  const storyText = (isAr ? company?.about_text_ar : company?.about_text_en) || t("about.storyP1");

  return (
    <section className="relative py-20 bg-[#050807] text-[#F2F6F5] select-none overflow-hidden">
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-radial from-[#09937F]/20 via-[#014842]/10 to-transparent blur-3xl pointer-events-none"
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* CEO Portrait Graphic Canvas */}
        <motion.div
          initial={{ opacity: 0, x: isAr ? 40 : -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="lg:col-span-5 relative flex flex-col items-center justify-center"
        >
          {/* Animated Background Ring & Aperture Graphic */}
          <div className="relative w-full max-w-[420px] aspect-[3/4] flex items-center justify-center">
            {/* Rotating Camera Aperture Overlay */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-[#09937F]"
            >
              <Aperture className="w-full h-full stroke-[0.75]" />
            </motion.div>

            {/* Backdrop Glass Glow Card */}
            <div className="absolute inset-4 rounded-3xl bg-gradient-to-b from-[#014842]/40 via-[#0B1210] to-[#050807] border border-[#09937F]/30 shadow-2xl overflow-hidden backdrop-blur-xl" />

            {/* CEO Transparent Cutout Portrait */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10 w-full h-full flex items-end justify-center pt-8 px-4"
            >
              <img
                src="/images/ceo-cutout.png"
                alt={ceoName}
                className="w-full h-full object-cover object-top filter drop-shadow-[0_20px_30px_rgba(9,147,127,0.35)] transition-all duration-500"
              />

              {/* Gradient Mask at bottom to blend cutout seamlessly */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050807] via-[#050807]/80 to-transparent pointer-events-none" />
            </motion.div>

            {/* Live Camera Viewfinder Overlay Graphics */}
            <div className="absolute top-8 left-8 z-20 flex items-center gap-1.5 text-[10px] font-sans font-bold text-[#5EEAD4]">
              <span className="text-[#09937F] font-mono opacity-80">&lt;&lt;</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>REC · 8K VV</span>
              <span className="text-[#09937F] font-mono opacity-80">&gt;&gt;</span>
            </div>

            <div className="absolute top-8 right-8 z-20 text-[10px] font-sans text-[#9EADA9] font-bold tracking-widest uppercase">
              &lt;&lt; 100% GCC &gt;&gt;
            </div>

            {/* Floating Glass Badge Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute bottom-6 left-6 right-6 z-30 p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-[#09937F]/40 shadow-2xl flex items-center justify-between"
            >
              <div>
                <div className="text-[11px] font-bold text-[#09937F] uppercase tracking-wider font-sans">
                  &lt;&lt; {ceoTitle} &gt;&gt;
                </div>
                <div className="text-lg font-bold text-white mt-0.5 font-display">
                  {ceoName}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Technical Telemetry Text Tags */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-sans text-[#9EADA9] font-bold uppercase tracking-wider">
            <span>&lt;&lt; RED V-Raptor XL &gt;&gt;</span>
            <span>&lt;&lt; DaVinci Certified &gt;&gt;</span>
          </div>
        </motion.div>

        {/* Narrative & Quote Column */}
        <motion.div
          initial={{ opacity: 0, x: isAr ? -40 : 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="lg:col-span-7 space-y-8"
        >
          <div className="space-y-3">
            <SectionBadge>{t("about.badge")}</SectionBadge>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display leading-[1.1]">
              {t("about.title")}
            </h1>
            <p className="text-base sm:text-xl text-[#9EADA9] leading-relaxed font-sans max-w-2xl">
              {t("about.subtitle")}
            </p>
          </div>

          {/* Graphic Quote Box */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative p-6 sm:p-8 rounded-3xl bg-[#0B1210] border border-[#09937F]/40 shadow-2xl overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#09937F]/20 to-transparent blur-xl pointer-events-none" />
            <Quote className="w-10 h-10 text-[#09937F]/30 absolute top-4 left-4 pointer-events-none group-hover:text-[#09937F]/50 transition-colors" />

            <p className="relative z-10 text-lg sm:text-xl font-serif italic text-white leading-relaxed">
              "{ceoQuote}"
            </p>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#9EADA9] font-sans">
              <span className="font-bold text-[#5EEAD4]">{ceoName}</span>
              <span>{t("about.location")}</span>
            </div>
          </motion.div>

          <div className="space-y-4 font-sans text-sm sm:text-base text-[#9EADA9] leading-relaxed">
            <p className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
              {storyText}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
