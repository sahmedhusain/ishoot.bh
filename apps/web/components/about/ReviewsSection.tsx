"use client";

import * as React from "react";
import Link from "next/link";
import { Star, ArrowUpRight, MessageSquarePlus, Quote } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal";
import { motion } from "framer-motion";
import type { Review } from "@ishoot/database/types";

export function ReviewsSection({
  reviews,
}: {
  reviews: Pick<
    Review,
    | "id"
    | "rating"
    | "quoteAr"
    | "quoteEn"
    | "authorAr"
    | "authorEn"
    | "companyAr"
    | "companyEn"
  >[];
}) {
  const { t, locale, isRTL: ar } = useTranslation();
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <section id="reviews" className="relative z-10 bg-[#050807] text-[#F2F6F5] py-24 select-none border-t border-white/10">
      <div className="shell space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-3"
          >
            <SectionBadge>{t("reviews.sectionLabel") || (ar ? "آراء العملاء" : "Client Testimonials")}</SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white leading-tight">
              {t("reviews.headline") || (ar ? "ثقة رواد الصناعة والشركات." : "Trusted by Industry Leaders.")}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] font-sans max-w-xl leading-relaxed">
              {t("reviews.subtitle") || (ar ? "تجارب حقيقية تعكس التزامنا بالدقة البصرية والإنتاج الاستثنائي." : "Real experiences reflecting our commitment to optical precision and cinema craft.")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#09937F]/15 hover:bg-[#09937F]/25 text-[#5EEAD4] border border-[#09937F]/40 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>{t("reviews.writeReviewBtn") || (ar ? "شارك تجربتك" : "Rate & Review Us")}</span>
            </button>
          </motion.div>
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {reviews.slice(0, 6).map((review, idx) => (
              <motion.figure
                key={review.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative p-6 sm:p-8 rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all flex flex-col justify-between space-y-6 shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      aria-label={`${review.rating} / 5`}
                      className="flex gap-1 text-amber-400"
                    >
                      {Array.from(
                        { length: Math.max(0, Math.min(5, review.rating)) },
                        (_, i) => (
                          <Star
                            key={i}
                            aria-hidden
                            className="w-4 h-4 fill-amber-400"
                          />
                        ),
                      )}
                    </div>
                    <Quote className="w-5 h-5 text-white/10 group-hover:text-[#09937F]/40 transition-colors" />
                  </div>

                  <blockquote className="text-sm sm:text-base leading-relaxed text-[#F2F6F5] font-sans italic">
                    "{ar ? review.quoteAr || review.quoteEn : review.quoteEn || review.quoteAr}"
                  </blockquote>
                </div>

                <figcaption className="pt-4 border-t border-white/5 flex flex-col font-sans">
                  <strong className="text-sm font-bold text-white group-hover:text-[#5EEAD4] transition-colors">
                    {ar ? review.authorAr || review.authorEn : review.authorEn || review.authorAr}
                  </strong>
                  {(review.companyAr || review.companyEn) && (
                    <span className="text-xs text-[#9EADA9] mt-0.5">
                      {ar ? review.companyAr : review.companyEn}
                    </span>
                  )}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-[#9EADA9] text-sm">
            {ar
              ? "عملت معنا؟ يسعدنا أن نسمع تجربتك وننشر تقييمك."
              : "Worked with us? We'd love to hear your feedback."}
          </div>
        )}
      </div>

      <ReviewSubmissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}

