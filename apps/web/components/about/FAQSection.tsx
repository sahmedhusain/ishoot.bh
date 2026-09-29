"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { ChevronDown } from "lucide-react";
import type { Faq } from "@ishoot/database/types";

interface FAQSectionProps {
  faqs: Faq[];
}

export function FAQSection({ faqs }: FAQSectionProps) {
  const { t, locale } = useTranslation();
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);
  const isAr = locale === "ar";

  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      id="faq"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("faq.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("faq.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {t("faq.headline")}
          </h2>
          <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
            {t("faq.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto divide-y divide-white/10">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={faq.id} className="py-6 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-start gap-4 group cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-white group-hover:text-[#5EEAD4] transition-colors font-sans">
                    {isAr ? faq.questionAr : faq.questionEn}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#09937F] transition-transform duration-300 ${isOpen ? "rotate-180 bg-[#014842] text-white" : ""}`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-4 text-xs sm:text-sm text-[#9EADA9] leading-relaxed font-sans max-w-3xl animate-fade-in">
                    {isAr ? faq.answerAr : faq.answerEn}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
