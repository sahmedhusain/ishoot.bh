"use client";
import type { PortfolioItem } from "@ishoot/database/types";
import { useLocale } from "../../hooks/useLocale";
import { Play, ArrowUpRight, Camera } from "lucide-react";
import { motion } from "framer-motion";

export function PortfolioCard({
  item,
  onClick,
}: {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
}) {
  const { isRTL: ar } = useLocale();
  const title = ar ? item.title_ar : item.title_en;
  const isVideo = Boolean(item.full_video_url || item.preview_video_url);

  return (
    <motion.button
      type="button"
      onClick={() => onClick(item)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="group text-start w-full rounded-2xl bg-gradient-to-b from-[#014842]/20 via-[#0B1210] to-[#050807] border border-[#09937F]/25 hover:border-[#09937F]/60 p-2.5 sm:p-3 transition-colors duration-300 shadow-xl hover:shadow-[0_16px_40px_rgba(9,147,127,0.22)] focus:outline-none focus:ring-2 focus:ring-[#09937F]/50"
      aria-label={`${ar ? "عرض المشروع" : "View project"}: ${title}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black/40">
        <img
          src={item.thumbnail_url}
          alt={title}
          loading="lazy"
          width={800}
          height={500}
          className="w-full h-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-105"
        />

        {/* Viewfinder corner brackets */}
        <div className="absolute top-2.5 start-2.5 w-3 h-3 border-t-2 border-s-2 border-[#09937F]/70 pointer-events-none transition-all duration-300 group-hover:scale-110" />
        <div className="absolute top-2.5 end-2.5 w-3 h-3 border-t-2 border-e-2 border-[#09937F]/70 pointer-events-none transition-all duration-300 group-hover:scale-110" />
        <div className="absolute bottom-2.5 start-2.5 w-3 h-3 border-b-2 border-s-2 border-[#09937F]/70 pointer-events-none transition-all duration-300 group-hover:scale-110" />
        <div className="absolute bottom-2.5 end-2.5 w-3 h-3 border-b-2 border-e-2 border-[#09937F]/70 pointer-events-none transition-all duration-300 group-hover:scale-110" />

        {/* Telemetry pill */}
        <div className="absolute top-3 start-3 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-[#09937F]/40 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-mono tracking-wider text-[#5EEAD4] uppercase">
            {isVideo ? "4K REC" : "STILL"}
          </span>
        </div>

        {/* Action badge */}
        <span className="absolute bottom-3 end-3 rounded-full bg-[#09937F] text-white p-2.5 shadow-[0_0_16px_rgba(9,147,127,0.6)] group-hover:bg-[#5EEAD4] group-hover:text-[#050807] transition-all duration-300 transform group-hover:scale-110">
          {isVideo ? (
            <Play className="w-4 h-4 fill-current" />
          ) : (
            <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
          )}
        </span>
      </div>

      <div className="p-2 sm:p-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold font-display text-white group-hover:text-[#5EEAD4] transition-colors line-clamp-1">
            {title}
          </h2>
          {item.year && (
            <span className="text-xs font-mono text-[#09937F] font-semibold shrink-0">
              {item.year}
            </span>
          )}
        </div>
        {item.client_name && (
          <p className="text-xs sm:text-sm text-[#9EADA9] mt-1 font-medium line-clamp-1">
            {item.client_name}
          </p>
        )}
      </div>
    </motion.button>
  );
}
