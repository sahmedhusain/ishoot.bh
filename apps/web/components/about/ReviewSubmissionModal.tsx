"use client";

import * as React from "react";
import { Star, X, CheckCircle2, MessageSquarePlus, Loader2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewSubmissionModal({
  isOpen,
  onClose,
}: ReviewSubmissionModalProps) {
  const { t, locale, isRTL } = useTranslation();

  const [rating, setRating] = React.useState(5);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [authorName, setAuthorName] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [quote, setQuote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !quote.trim()) {
      setError(t("reviews.modal.validationError"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName,
          companyName,
          rating,
          quote,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit review");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setAuthorName("");
    setCompanyName("");
    setQuote("");
    setRating(5);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleReset();
      }}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="relative w-full max-w-lg rounded-3xl bg-[#0B1210] border border-[#09937F]/40 shadow-2xl p-6 sm:p-8 text-white space-y-6 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#09937F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#09937F]/20 text-[#09937F]">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                {t("reviews.modal.title")}
              </h3>
              <p className="text-xs text-[#9EADA9]">
                {t("reviews.modal.subtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9EADA9] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">
                {t("reviews.modal.thankYouTitle")}
              </h4>
              <p className="text-xs text-[#9EADA9] max-w-sm mx-auto leading-relaxed">
                {t("reviews.modal.thankYouDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl bg-[#014842] hover:bg-[#014842]/90 text-white font-semibold text-xs transition-colors border border-[#09937F]/40"
            >
              {t("reviews.modal.close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Star Rating Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90 block">
                {t("reviews.modal.starRating")}
              </label>
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 justify-center">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          active
                            ? "text-amber-400 fill-amber-400"
                            : "text-neutral-600 stroke-1"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#9EADA9]">
                  {t("reviews.modal.fullName")}
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={t("reviews.modal.fullNamePlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#09937F] focus:ring-1 focus:ring-[#09937F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#9EADA9]">
                  {t("reviews.modal.company")}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("reviews.modal.companyPlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#09937F] focus:ring-1 focus:ring-[#09937F]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t("reviews.modal.quote")}
              </label>
              <textarea
                required
                rows={4}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder={t("reviews.modal.quotePlaceholder")}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#09937F] focus:ring-1 focus:ring-[#09937F] resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9EADA9] hover:text-white transition-colors"
              >
                {t("reviews.modal.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#014842] hover:bg-[#014842]/90 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-[#09937F]/40 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("reviews.modal.submitting")}</span>
                  </>
                ) : (
                  <span>{t("reviews.modal.submit")}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
