"use client";

import * as React from "react";
import type { Statistic } from "@ishoot/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { motion } from "framer-motion";

export function StatsSection({ stats }: { stats: Statistic[] }) {
  const { t, isRTL: ar } = useTranslation();
  if (!stats || !stats.length) return null;

  return (
    <section className="relative z-20 bg-[#050807] text-[#F2F6F5] py-20 select-none border-t border-white/10">
      <div className="shell space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative p-8 sm:p-10 rounded-3xl bg-[#0B1210] border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Background Graphic Grid */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex items-center justify-between pb-6 mb-6 border-b border-white/10 text-xs font-sans text-[#9EADA9]">
            <div className="flex items-center gap-2 font-bold text-[#5EEAD4] uppercase tracking-wider">
              &lt;&lt; {t("about.stats.badge")} &gt;&gt;
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#09937F] font-bold">
              &lt;&lt; {t("about.stats.verified")} &gt;&gt;
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.03 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#09937F]/40 transition-all text-center space-y-3 cursor-pointer"
              >
                {(stat.subLabelAr || stat.subLabelEn) && (
                  <div className="text-xs font-bold text-[#09937F] font-sans">
                    &lt;&lt; {ar ? stat.subLabelAr : stat.subLabelEn} &gt;&gt;
                  </div>
                )}
                <div>
                  <div className="text-3xl sm:text-5xl font-extrabold text-white group-hover:text-[#5EEAD4] transition-colors font-display tracking-tight tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#F2F6F5] font-sans mt-2">
                    {ar ? stat.labelAr : stat.labelEn}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

