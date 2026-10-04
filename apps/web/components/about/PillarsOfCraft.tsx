"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { motion, useReducedMotion } from "framer-motion";

export function PillarsOfCraft() {
  const reduced = useReducedMotion();
  const { t } = useTranslation();

  const pillarKeys = ["p1", "p2", "p3", "p4"] as const;

  return (
    <section className="relative z-10 bg-[#050807] text-[#F2F6F5] py-20 sm:py-28 border-t border-white/10 overflow-hidden">
      <div className="shell relative z-10 space-y-12">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
          className="space-y-3"
        >
          <SectionBadge>{t("about.pillars.badge")}</SectionBadge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {t("about.pillars.title")}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pillarKeys.map((key, idx) => {
            return (
              <motion.div
                key={key}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: reduced ? 0 : 0.45,
                  delay: reduced ? 0 : Math.min(idx * 0.06, 0.18),
                }}
                className="relative py-8 border-t border-white/15 flex flex-col space-y-5"
              >
                <div className="flex items-center justify-between font-sans relative z-10">
                  <span className="text-xs font-sans font-bold text-[#5EEAD4]">
                    {t(`about.pillars.${key}.number`)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#5EEAD4] tracking-widest ">
                    {t(`about.pillars.${key}.tag`)}
                  </span>
                </div>

                <div className="space-y-3 relative z-10">
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#5EEAD4] transition-colors font-display">
                    {t(`about.pillars.${key}.title`)}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9EADA9] font-sans leading-relaxed">
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
