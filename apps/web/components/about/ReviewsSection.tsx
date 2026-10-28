"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";

import * as React from "react";
import { Star, MessageSquarePlus, Quote } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ReviewSubmissionModal } from "./ReviewSubmissionModal";
import { motion } from "framer-motion";
import type { Review } from "@platform/database/types";

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
  const reduced = useSiteReducedMotion();
  const { t, isArabic: ar, site } = useTranslation();
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <section
      id="reviews"
      className="relative bg-m3-surface text-ink py-20 sm:py-28 border-t border-m3-outline-variant"
    >
      <div className="shell space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-m3-outline-variant">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
            className="space-y-3"
          >
            <SectionBadge className="!text-accent-pressed">
              {t("reviews.sectionLabel")}
            </SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
              {t("reviews.headline")}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted font-sans max-w-xl leading-relaxed">
              {t("reviews.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: reduced ? 0 : 0.45,
              delay: reduced ? 0 : 0.08,
            }}
          >
            {site?.commerce?.capabilities.inquiries !== false && <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-md bg-m3-surface-container-low hover:bg-m3-surface-container text-accent-pressed border border-m3-outline font-semibold text-sm transition-colors duration-150 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>{t("reviews.writeReviewBtn")}</span>
            </button>}
          </motion.div>
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {reviews.slice(0, 6).map((review, idx) => (
              <motion.figure
                key={review.id}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: reduced ? 0 : 0.45,
                  delay: reduced ? 0 : Math.min(idx * 0.06, 0.18),
                }}
                className="relative p-6 sm:p-8 rounded-lg bg-m3-surface-container-low border border-m3-outline-variant flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      aria-label={`${review.rating} / 5`}
                      className="flex gap-1 text-accent-pressed"
                    >
                      {Array.from(
                        { length: Math.max(0, Math.min(5, review.rating)) },
                        (_, i) => (
                          <Star
                            key={i}
                            aria-hidden
                            className="w-4 h-4 fill-current"
                          />
                        ),
                      )}
                    </div>
                    <Quote className="w-5 h-5 text-ink-muted" />
                  </div>

                  <blockquote className="text-sm sm:text-base leading-relaxed text-ink font-sans italic">
                    &quot;
                    {ar
                      ? review.quoteAr || review.quoteEn
                      : review.quoteEn || review.quoteAr}
                    &quot;
                  </blockquote>
                </div>

                <figcaption className="pt-4 border-t border-m3-outline-variant flex flex-col font-sans">
                  <strong className="text-sm font-bold text-ink">
                    {ar
                      ? review.authorAr || review.authorEn
                      : review.authorEn || review.authorAr}
                  </strong>
                  {(review.companyAr || review.companyEn) && (
                    <span className="text-xs text-ink-muted mt-0.5">
                      {ar ? review.companyAr : review.companyEn}
                    </span>
                  )}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant text-ink-muted text-sm">
            {t("reviews.empty")}
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
