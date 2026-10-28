"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";

import * as React from "react";
import { safeLegalHtml } from "../../lib/legal-html";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function LegalModal({
  isOpen,
  onClose,
  title,
  content,
}: LegalModalProps) {
  const { isRTL, t } = useTranslation();
  const reduced = useSiteReducedMotion();
  const dialog = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

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
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      dir={isRTL ? "rtl" : "ltr"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="legal-dialog m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[88dvh] p-0 rounded-2xl bg-m3-surface-container-low text-ink border border-m3-outline-variant shadow-2xl backdrop:bg-black/75"
      data-lenis-prevent
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
        className="flex flex-col max-h-[88dvh]"
      >
        <div className="flex items-start justify-between gap-5 p-6 sm:px-8 bg-brand-surface text-white">
          <h2
            id={titleId}
            className="text-2xl sm:text-3xl font-bold font-display leading-tight"
          >
            {title}
          </h2>
          <button
            autoFocus
            onClick={onClose}
            className="min-w-11 min-h-11 -mt-1 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label={t("footer.close")}
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>
        <div
          className="min-h-0 overflow-y-auto overscroll-contain px-6 py-8 sm:px-10"
          data-lenis-prevent
        >
          {isHtml ? (
            <div
              className="legal-document"
              dangerouslySetInnerHTML={{ __html: safeLegalHtml(content) }}
            />
          ) : (
            <div className="legal-document space-y-7">
              {content
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, index) => {
                  const clause = paragraph.match(
                    /^([\d\u0660-\u0669\u06f0-\u06f9]+[.)]\s*[^:\n]+):\s*([\s\S]*)$/,
                  );
                  return clause ? (
                    <div key={index}>
                      <h3>{clause[1]}</h3>
                      <p>{clause[2]}</p>
                    </div>
                  ) : (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  );
                })}
            </div>
          )}
        </div>
        <div className="px-6 py-4 sm:px-8 bg-m3-surface-container flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="min-h-11 px-6 rounded-lg bg-m3-primary text-m3-on-primary text-sm font-semibold hover:bg-tone-20 transition-colors"
          >
            {t("footer.close")}
          </button>
        </div>
      </motion.div>
    </dialog>
  );
}
