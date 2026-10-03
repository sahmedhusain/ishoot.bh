"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, Target, Eye } from "lucide-react";
import { motion } from "framer-motion";

import type { CompanySettings } from "@ishoot/database/types";

interface AboutSectionProps {
  clientLogos?: any[];
  company?: CompanySettings;
}

export function AboutSection({ clientLogos = [], company }: AboutSectionProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  return (
    <section id="about" className="katana-top relative z-10 bg-[#0B1210] text-[#F2F6F5] select-none pt-32 sm:pt-40 pb-24 border-t border-white/10">
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="shell relative z-10 space-y-12">
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          whileInView={{ opacity: 1, width: "100%" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative w-full"
        >
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4 flex items-center justify-between text-xs uppercase tracking-wider text-[#9EADA9] font-sans"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F] animate-pulse" />
              <span className="text-[#5EEAD4] font-bold">&lt;&lt; {t("about.sectionIndex")} &gt;&gt;</span>
            </span>
            <span className="font-bold text-white tracking-widest">
              ({t("about.sectionLabel")})
            </span>
            <span className="text-white/40">© {new Date().getFullYear()}</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-5xl space-y-4"
        >
          <h2 className="font-display text-[clamp(2rem,4.5vw,4.25rem)] leading-[1.08] tracking-tight font-bold text-white">
            {t("about.headline")}
          </h2>
          <p className="font-sans text-[clamp(1.05rem,1.8vw,1.4rem)] leading-relaxed text-[#9EADA9] max-w-3xl">
            {t("about.intro")}
          </p>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,440px)_1fr] items-center pt-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#0B1210] border border-white/10 group shadow-2xl"
          >
            <img
              src="/banners/web-banner-04.jpg"
              alt="Production Studio"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-75 group-hover:opacity-85 transition-opacity" />
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-[#5EEAD4] block font-sans font-bold">
                &lt;&lt; {t("about.behindTheScenes")} &gt;&gt;
              </span>
              <p className="text-sm font-bold font-sans">
                {t("about.shootCaption")}
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-2xl bg-[#0B1210] border border-white/10 space-y-3 shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#5EEAD4] uppercase tracking-widest font-sans">
                <Target className="w-4 h-4 text-[#09937F]" />
                <span>&lt;&lt; {t("about.missionLabel")} &gt;&gt;</span>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-[#F2F6F5] max-w-xl font-sans">
                {(isAr ? company?.mission_ar : company?.mission_en) ||
                  t("about.mission")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6 rounded-2xl bg-[#0B1210] border border-white/10 space-y-3 shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#5EEAD4] uppercase tracking-widest font-sans">
                <Eye className="w-4 h-4 text-[#09937F]" />
                <span>&lt;&lt; {t("about.visionLabel")} &gt;&gt;</span>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-[#F2F6F5] max-w-xl font-sans">
                {(isAr ? company?.vision_ar : company?.vision_en) ||
                  t("about.vision")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="pt-2"
            >
              <Link
                href={`/${locale}/about`}
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#09937F]/15 hover:bg-[#09937F]/25 text-[#5EEAD4] border border-[#09937F]/40 text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                <span>{t("about.discoverStudio")}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
