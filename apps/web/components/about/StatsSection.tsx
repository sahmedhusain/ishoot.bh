"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Film, Video, Building2, Flame, Plane, Award } from "lucide-react";
import type { Statistic } from "@ishoot/database/types";
import { motion } from "framer-motion";

interface StatsSectionProps {
  stats: Statistic[];
}

const ICONS_MAP: Record<string, React.ElementType> = {
  Film,
  Video,
  Building2,
  Flame,
  Plane,
  Award,
};

export function StatsSection({ stats }: StatsSectionProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  const items = stats.length > 0 ? stats : [];

  return (
    <section
      id="stats"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
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
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("stats.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("stats.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((stat, i) => {
            const Icon = (stat.icon && ICONS_MAP[stat.icon]) ? ICONS_MAP[stat.icon] : Film;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 15 } }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-colors p-8 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-[#09937F]/10 flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between font-sans">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="w-10 h-10 rounded-xl bg-[#014842]/40 border border-[#09937F]/30 flex items-center justify-center text-[#5EEAD4]"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  <span className="text-[10px] text-[#9EADA9]">
                    0{i + 1}
                  </span>
                </div>

                <div>
                  <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight group-hover:text-emerald-shine transition-colors font-display">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm sm:text-base font-bold text-white font-sans">
                    {isAr ? stat.labelAr : stat.labelEn}
                  </div>
                  <div className="mt-1 text-xs text-[#9EADA9] font-sans leading-relaxed">
                    {isAr ? stat.subLabelAr : stat.subLabelEn}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
