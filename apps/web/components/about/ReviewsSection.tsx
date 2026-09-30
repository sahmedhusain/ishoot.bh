"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Star, MessageSquarePlus } from "lucide-react";
import type { Review } from "@ishoot/database/types";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal";

interface ReviewsSectionProps {
  reviews: Review[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <section
      id="reviews"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("reviews.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("reviews.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              {t("reviews.headline")}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
              {t("reviews.subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="self-start md:self-end px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-[#014842] border border-white/10 hover:border-[#09937F]/50 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all group shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#09937F] group-hover:text-white transition-colors" />
            <span>{t("reviews.writeReviewBtn")}</span>
          </button>
        </div>

        <ReviewSubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 p-8 space-y-6 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-emerald-400">
                  {[...Array(rev.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans italic">
                  {isAr ? rev.quoteAr : rev.quoteEn}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-1">
                <div className="text-xs font-bold text-white font-sans">
                  {isAr ? rev.companyAr : rev.companyEn}
                </div>
                <div className="text-[11px] text-[#9EADA9] font-sans">
                  {isAr ? rev.authorAr : rev.authorEn}
                </div>
                <div className="text-[10px] font-mono text-[#09937F]">
                  {t("reviews.bahrain")} · {rev.year}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
