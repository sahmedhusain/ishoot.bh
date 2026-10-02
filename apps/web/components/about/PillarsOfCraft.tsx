"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { motion } from "framer-motion";

export function PillarsOfCraft() {
  const { t } = useTranslation();

  const pillarKeys = ["p1", "p2", "p3", "p4"] as const;

  return (
    <section className="katana-top relative z-10 bg-[#F8FAFC] text-[#0F172A] py-28 select-none border-t border-slate-200">
      <div className="shell space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          <SectionBadge>{t("about.pillars.badge")}</SectionBadge>
          <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 font-display">
            {t("about.pillars.title")}
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pillarKeys.map((key, idx) => {
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative p-8 sm:p-9 rounded-3xl bg-white border border-slate-200 hover:border-[#09937F] transition-all shadow-xl flex flex-col justify-between space-y-6 overflow-hidden cursor-pointer"
              >
                <div className="flex items-center justify-between font-sans relative z-10">
                  <span className="text-xs font-bold text-[#014842]">
                    &lt;&lt; {t(`about.pillars.${key}.number`)} &gt;&gt;
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#014842] tracking-widest bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    &lt;&lt; {t(`about.pillars.${key}.tag`)} &gt;&gt;
                  </span>
                </div>

                <div className="space-y-3 relative z-10">
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#014842] transition-colors font-display">
                    {t(`about.pillars.${key}.title`)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
                    {t(`about.pillars.${key}.desc`)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
