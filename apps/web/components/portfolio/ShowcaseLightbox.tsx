"use client";

import { ContentImage } from "../shared/ContentImage";
import * as React from "react";
import type { PortfolioItem } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { X } from "lucide-react";

export function ShowcaseLightbox({
  item,
  isOpen,
  onClose,
}: {
  item: PortfolioItem | null;
  isOpen?: boolean;
  onClose: () => void;
}) {
  const { t, isArabic: ar, isRTL } = useTranslation();
  const dialog = React.useRef<HTMLDialogElement>(null);
  const open = !!item && isOpen !== false;
  React.useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  if (!item || !open) return null;
  const title = ar ? item.title_ar : item.title_en;
  const video = item.full_video_url || item.preview_video_url;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="project-dialog-title"
      dir={isRTL ? "rtl" : "ltr"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90dvh] overflow-y-auto rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant shadow-m3-5 p-0 backdrop:bg-black/75"
      data-lenis-prevent
    >
      <div>
        <header className="p-5 sm:px-6 flex items-start justify-between gap-4 border-b border-m3-outline-variant">
          <div>
            {(item.client_name || item.year) && (
              <p className="text-xs font-medium text-m3-primary">
                {[item.client_name, item.year].filter(Boolean).join(" · ")}
              </p>
            )}
            <h2
              id="project-dialog-title"
              className="text-xl sm:text-2xl font-display font-bold text-m3-on-surface mt-1"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            aria-label={t("common.close")}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-m3-surface-container-highest text-m3-on-surface hover:bg-m3-on-surface/[0.08] transition-colors cursor-pointer shrink-0"
            onClick={onClose}
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </header>
        <div className="bg-m3-surface-container-lowest">
          {video ? (
            <video
              key={item.id}
              src={video}
              poster={item.thumbnail_url}
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-video object-contain bg-black"
            />
          ) : (
            <ContentImage
              src={item.thumbnail_url}
              alt={title}
              className="w-full max-h-[65vh] object-contain mx-auto"
            />
          )}
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <p className="text-sm sm:text-base leading-relaxed text-m3-on-surface-variant">
            {ar ? item.description_ar : item.description_en}
          </p>
          {item.credits && Object.values(item.credits).some(Boolean) && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container border border-m3-outline-variant text-sm">
              {Object.entries(item.credits).map(([key, val]) => {
                if (!val) return null;
                const label = t(`portfolio.${key}`) || key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div key={key}>
                    <dt className="text-m3-on-surface-variant text-xs font-medium">{label}</dt>
                    <dd className="mt-1 font-semibold text-m3-on-surface">{val}</dd>
                  </div>
                );
              })}
            </dl>
          )}
          {!!item.gallery_urls?.length && (
            <div className="grid sm:grid-cols-2 gap-4">
              {item.gallery_urls.map((url, i) => (
                <ContentImage
                  key={url}
                  src={url}
                  alt={`${title} — ${i + 1}`}
                  loading="lazy"
                  className="w-full rounded-[var(--md-sys-shape-corner-medium,12px)] border border-m3-outline-variant"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
