"use client";
import { ContentImage } from "../shared/ContentImage";
import * as React from "react";
import type { PortfolioItem } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { X } from "lucide-react";
export function CinemaLightbox({
  item,
  isOpen,
  onClose,
}: {
  item: PortfolioItem | null;
  isOpen?: boolean;
  onClose: () => void;
}) {
  const { t, isArabic: ar } = useTranslation();
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
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90dvh] overflow-y-auto rounded-lg bg-m3-surface-container-low text-ink border border-m3-outline-variant p-0 backdrop:bg-black/85"
      data-lenis-prevent
    >
      <div>
        <header className="p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-ink-muted">
              {item.client_name} · {item.year}
            </p>
            <h2
              id="project-dialog-title"
              className="text-xl font-semibold mt-1"
            >
              {title}
            </h2>
          </div>
          <button
            autoFocus
            aria-label={t("common.close")}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-white/10"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </header>
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
            className="w-full max-h-[65vh] object-contain"
          />
        )}
        <p className="p-5 text-sm leading-relaxed text-ink-muted">
          {ar ? item.description_ar : item.description_en}
        </p>
        {item.credits && Object.values(item.credits).some(Boolean) && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 pb-5 text-sm">
            {Object.entries(item.credits).map(([key, val]) => {
              if (!val) return null;
              const label = t(`portfolio.${key}`) || key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div key={key}>
                  <dt className="text-ink-muted text-xs">{label}</dt>
                  <dd className="mt-1">{val}</dd>
                </div>
              );
            })}
          </dl>
        )}
        {!!item.gallery_urls?.length && (
          <div className="grid sm:grid-cols-2 gap-4 p-5">
            {item.gallery_urls?.map((url, i) => (
              <ContentImage
                key={url}
                src={url}
                alt={`${title} — ${i + 1}`}
                loading="lazy"
                className="w-full rounded"
              />
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
