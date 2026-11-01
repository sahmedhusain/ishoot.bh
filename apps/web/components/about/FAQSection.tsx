"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";

import * as React from "react";
import type { Faq } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FAQSection({ faqs }: { faqs: Faq[] }) {
  const { t, isArabic: ar } = useTranslation();
  const reduced = useSiteReducedMotion();
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (!faqs || !faqs.length) return null;

  return (
    <section
      id="faq"
      className="relative z-50 bg-m3-surface text-m3-on-surface py-20 sm:py-28 border-t border-m3-outline-variant"
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
          <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-m3-on-surface leading-tight">
            {t("faq.headline")}
          </h2>
          <p className="text-sm sm:text-base text-m3-on-surface-variant font-sans leading-relaxed max-w-md">
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
                className={`rounded-2xl border transition-colors duration-150 overflow-hidden ${isOpen
                  ? "bg-m3-surface-container-low border-m3-primary/50 shadow-m3-1"
                  : "bg-m3-surface-container-low/60 border-m3-outline-variant hover:border-m3-outline"
                  }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="group w-full p-5 sm:p-6 text-start flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-display font-bold text-base sm:text-lg text-m3-on-surface group-hover:text-m3-primary transition-colors">
                    {ar ? faq.questionAr : faq.questionEn}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen
                      ? "bg-m3-secondary-container text-m3-on-secondary-container rotate-180"
                      : "bg-m3-surface-container-high text-m3-on-surface-variant"
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
                      className="max-h-[40rem] overflow-y-auto"
                    >
                      <div className="px-5 pb-6 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm leading-relaxed text-m3-on-surface-variant font-sans whitespace-pre-wrap">
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
