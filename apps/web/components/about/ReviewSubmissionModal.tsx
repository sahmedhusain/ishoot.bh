"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import {
  Star,
  X,
  CheckCircle2,
  MessageSquarePlus,
  Loader2,
} from "lucide-react";
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

  const submissionKey = React.useRef<string>("");
  const [rating, setRating] = React.useState(5);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [authorName, setAuthorName] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [quote, setQuote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dialog = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const nameId = React.useId();
  const companyId = React.useId();
  const quoteId = React.useId();
  React.useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen]);
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
      if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionKey: submissionKey.current,
          authorName,
          companyName,
          rating,
          quote,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          res.status === 429
            ? t("contact.rateLimit")
            : t("contact.submissionFailed"),
        );
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || t("contact.connectionFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    submissionKey.current = "";
    setSubmitted(false);
    setAuthorName("");
    setCompanyName("");
    setQuote("");
    setRating(5);
    setError(null);
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        handleReset();
      }}
      data-lenis-prevent
      className="m-auto p-0 w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto bg-brand-surface rounded-2xl text-paper border border-white/15 backdrop:bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleReset();
      }}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="relative p-6 sm:p-8 text-white space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/20 text-accent">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3
                id={titleId}
                className="text-lg font-bold text-white font-display"
              >
                {t("reviews.modal.title")}
              </h3>
              <p className="text-xs text-ink-muted">
                {t("reviews.modal.subtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            aria-label={t("common.close")}
            autoFocus
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink-muted hover:text-white hover:bg-white/10 transition-colors"
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
              <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
                {t("reviews.modal.thankYouDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-paper font-semibold text-xs transition-colors border border-accent/40"
            >
              {t("reviews.modal.close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs"
              >
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
                      aria-label={formatMessage(t("contact.ratingOption"), { value: String(star) })}
                      aria-pressed={rating === star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="min-w-11 min-h-11 flex items-center justify-center transition-transform motion-safe:hover:scale-110"
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
                <label
                  htmlFor={nameId}
                  className="text-xs font-medium text-ink-muted"
                >
                  {t("reviews.modal.fullName")}
                </label>
                <input
                  id={nameId}
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={t("reviews.modal.fullNamePlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={companyId}
                  className="text-xs font-medium text-ink-muted"
                >
                  {t("reviews.modal.company")}
                </label>
                <input
                  id={companyId}
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("reviews.modal.companyPlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={quoteId}
                className="text-xs font-medium text-ink-muted"
              >
                {t("reviews.modal.quote")}
              </label>
              <textarea
                id={quoteId}
                required
                rows={4}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder={t("reviews.modal.quotePlaceholder")}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-white transition-colors"
              >
                {t("reviews.modal.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-paper text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-accent/40 shadow-sm disabled:opacity-50"
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
    </dialog>
  );
}
