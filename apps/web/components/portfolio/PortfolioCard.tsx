"use client";
import {ContentImage} from "../shared/ContentImage";
import type { PortfolioItem } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { Play, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function PortfolioCard({
  item,
  onClick,
}: {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
}) {
  const { t, isRTL: ar } = useTranslation();
  const reduced = useReducedMotion();
  const title = ar ? item.title_ar : item.title_en;
  const isVideo = Boolean(item.full_video_url || item.preview_video_url);

  return (
    <motion.button
      type="button"
      onClick={() => onClick(item)}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.2, 0, 0, 1] }}
      className="group text-start w-full rounded-md transition-colors duration-150"
      aria-label={`${t("portfolio.viewProject")}: ${title}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black/40">
        <ContentImage
          src={item.thumbnail_url}
          alt={title}
          loading="lazy"
          width={800}
          height={500}
          className="w-full h-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.025]"
        />

        {/* Action badge */}
        <span className="absolute bottom-3 end-3 rounded-full bg-[var(--web-accent)] text-white p-3 group-hover:bg-mint group-hover:text-brand-base transition-colors duration-150">
          {isVideo ? (
            <Play className="w-4 h-4 fill-current" />
          ) : (
            <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
          )}
        </span>
      </div>

      <div className="pt-5 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold font-display text-white group-hover:text-mint transition-colors ">
            {title}
          </h2>
          {item.year && (
            <span className="text-xs text-ink-muted font-semibold shrink-0">
              {item.year}
            </span>
          )}
        </div>
        {item.client_name && (
          <p className="text-xs sm:text-sm text-ink-muted mt-1 font-medium ">
            {item.client_name}
          </p>
        )}
      </div>
    </motion.button>
  );
}
