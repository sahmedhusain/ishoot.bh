"use client";

import * as React from "react";
import type { Faq } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ChevronDown } from "lucide-react";
import { motion,AnimatePresence,useReducedMotion } from "framer-motion";

export function FAQSection({ faqs }: { faqs: Faq[] }) {
  const { t, isRTL: ar } = useTranslation();
  const reduced = useReducedMotion();
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (!faqs || !faqs.length) return null;

  return (
    <section
      id="faq"
      className="katana-top relative z-50 bg-[#0B1210] text-[#F2F6F5] pt-32 sm:pt-40 pb-24 border-t border-white/10 "
    >
      <div className="shell grid lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-16">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="space-y-4"
        >
          <SectionBadge>{t("faq.sectionLabel")}</SectionBadge>
          <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white leading-tight">
            {t("faq.headline")}
          </h2>
          <p className="text-sm sm:text-base text-[#9EADA9] font-sans leading-relaxed max-w-md">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={faq.id}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: reduced ? 0 : 0.4,
                  delay: reduced ? 0 : Math.min(idx * 0.06, 0.18),
                }}
                className={`rounded-2xl border transition-colors duration-150 overflow-hidden ${
                  isOpen
                    ? "bg-[#0B1210] border-[#09937F]/50 shadow-lg shadow-[#09937F]/10"
                    : "bg-white/[0.02] border-white/5 hover:border-white/15"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="group w-full p-5 sm:p-6 text-start flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-display font-bold text-base sm:text-lg text-white group-hover:text-[#5EEAD4] transition-colors">
                    {ar ? faq.questionAr : faq.questionEn}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "bg-[#09937F]/20 text-[#5EEAD4] rotate-180"
                        : "bg-white/5 text-[#9EADA9]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${faq.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: reduced ? 0 : 0.25,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm leading-relaxed text-[#9EADA9] font-sans whitespace-pre-wrap">
                        {ar ? faq.answerAr : faq.answerEn}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
