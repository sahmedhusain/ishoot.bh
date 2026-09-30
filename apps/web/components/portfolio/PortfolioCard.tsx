"use client";

import * as React from "react";
import { PortfolioItem } from "@ishoot/database";
import { useLocale } from "../../hooks/useLocale";
import { Play } from "lucide-react";

interface PortfolioCardProps {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
}

export function PortfolioCard({ item, onClick }: PortfolioCardProps) {
  const { isRTL } = useLocale();
  const [isHovered, setIsHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const title = isRTL ? item.title_ar : item.title_en;

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      if (videoRef.current && item.preview_video_url) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const aspectClass =
    {
      "16:9": "aspect-video",
      "2.39:1": "aspect-[2.39/1]",
      "9:16": "aspect-[9/16]",
      "1:1": "aspect-square",
      "4:5": "aspect-[4/5]",
    }[item.aspect_ratio] || "aspect-video";

  return (
    <div
      onClick={() => onClick(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative overflow-hidden rounded-2xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 cursor-pointer shadow-xl ${aspectClass}`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
        style={{ backgroundImage: `url(${item.thumbnail_url})` }}
      />

      {item.preview_video_url && (
        <video
          ref={videoRef}
          src={item.preview_video_url}
          muted
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

      <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-[#09937F] group-hover:border-[#09937F] transition-all">
        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#09937F]  tracking-widest uppercase">
          <span>{item.client_name}</span>
          <span>{item.year}</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-[#09937F] transition-colors">
          {title}
        </h3>
      </div>
    </div>
  );
}
