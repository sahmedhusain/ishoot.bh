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
      className="legal-dialog m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[88dvh] p-0 rounded-3xl bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant shadow-m3-4 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      data-lenis-prevent
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
        className="flex flex-col max-h-[88dvh]"
      >
        <div className="flex items-start justify-between gap-5 p-6 sm:px-8 bg-m3-surface-container border-b border-m3-outline-variant text-m3-on-surface">
          <h2
            id={titleId}
            className="text-2xl sm:text-3xl font-bold font-display leading-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            data-keep-round="true"
            className="m3-state-layer min-w-11 min-h-11 -mt-1 shrink-0 flex items-center justify-center rounded-full border border-m3-outline-variant bg-m3-surface-container-high text-m3-on-surface transition-colors cursor-pointer"
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
        <div className="px-6 py-4 sm:px-8 bg-m3-surface-container-low border-t border-m3-outline-variant flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-6 rounded-full bg-m3-primary text-m3-on-primary text-sm font-semibold hover:brightness-95 transition-all cursor-pointer"
          >
            {t("footer.close")}
          </button>
        </div>
      </motion.div>
    </dialog>
  );
}
