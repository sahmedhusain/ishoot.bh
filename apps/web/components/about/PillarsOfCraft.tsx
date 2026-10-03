"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { motion } from "framer-motion";

export function PillarsOfCraft() {
  const { t } = useTranslation();

  const pillarKeys = ["p1", "p2", "p3", "p4"] as const;

  return (
    <section className="katana-top relative z-10 bg-[#050807] text-[#F2F6F5] pt-32 sm:pt-40 pb-28 select-none border-t border-white/10 overflow-hidden">
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
        className="absolute top-1/3 end-1/4 w-[500px] h-[500px] bg-radial from-[#09937F]/15 via-[#014842]/5 to-transparent blur-3xl pointer-events-none"
      />

      <div className="shell relative z-10 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          <SectionBadge>{t("about.pillars.badge")}</SectionBadge>
          <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
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
                className="group relative p-8 sm:p-9 rounded-3xl bg-gradient-to-b from-[#014842]/20 via-[#0B1210] to-[#050807] border border-[#09937F]/30 hover:border-[#09937F] transition-all shadow-2xl flex flex-col justify-between space-y-6 overflow-hidden cursor-pointer"
              >
                <div className="flex items-center justify-between font-sans relative z-10">
                  <span className="text-xs font-mono font-bold text-[#5EEAD4]">
                    &lt;&lt; {t(`about.pillars.${key}.number`)} &gt;&gt;
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#5EEAD4] tracking-widest bg-black/60 px-3 py-1 rounded-lg border border-[#09937F]/40 backdrop-blur-md">
                    &lt;&lt; {t(`about.pillars.${key}.tag`)} &gt;&gt;
                  </span>
                </div>

                <div className="space-y-3 relative z-10">
                  <h4 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#5EEAD4] transition-colors font-display">
                    {t(`about.pillars.${key}.title`)}
                  </h4>
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
