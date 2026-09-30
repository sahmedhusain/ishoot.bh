"use client";

import * as React from "react";
import { PortfolioItem } from "@ishoot/database";
import { useTranslation } from "../../hooks/useTranslation";
import { X } from "lucide-react";

interface CinemaLightboxProps {
  item: PortfolioItem | null;
  isOpen?: boolean;
  onClose: () => void;
}

export function CinemaLightbox({ item, isOpen, onClose }: CinemaLightboxProps) {
  const { t, isRTL } = useTranslation();
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (item && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [item]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (item) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item || isOpen === false) return null;

  const title = isRTL ? item.title_ar : item.title_en;
  const description = isRTL ? item.description_ar : item.description_en;
  const videoUrl = item.full_video_url || item.preview_video_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#0B1210] border border-[#09937F]/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <span className="text-xs  text-[#09937F] uppercase tracking-wider">
              {item.client_name} • {item.year}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={item.thumbnail_url}
              playsInline
              loop
              controls
              className="w-full h-full object-contain"
            />
          ) : (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.thumbnail_url})` }}
            />
          )}
        </div>

        <div className="p-6 space-y-4 bg-[#080D0B] border-t border-white/10">
          {description && (
            <p className="text-sm text-[#9EADA9] leading-relaxed">
              {description}
            </p>
          )}

          {item.credits && (
            <div className="pt-2 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              {item.credits.director && (
                <div>
                  <span className="text-[#9EADA9]/60 block">
                    {t("portfolio.director")}:
                  </span>
                  <span className="text-white font-medium">
                    {item.credits.director}
                  </span>
                </div>
              )}
              {item.credits.dop && (
                <div>
                  <span className="text-[#9EADA9]/60 block">
                    {t("portfolio.dop")}:
                  </span>
                  <span className="text-white font-medium">
                    {item.credits.dop}
                  </span>
                </div>
              )}
              {item.credits.colorist && (
                <div>
                  <span className="text-[#9EADA9]/60 block">
                    {t("portfolio.colorist")}:
                  </span>
                  <span className="text-white font-medium">
                    {item.credits.colorist}
                  </span>
                </div>
              )}
              {item.credits.editor && (
                <div>
                  <span className="text-[#9EADA9]/60 block">
                    {t("portfolio.editor")}:
                  </span>
                  <span className="text-white font-medium">
                    {item.credits.editor}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
