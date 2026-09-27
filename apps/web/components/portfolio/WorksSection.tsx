"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import type { PortfolioItem } from "@ishoot/database";
import { ArrowUpRight, Play } from "lucide-react";
import { CinemaLightbox } from "./CinemaLightbox";

interface WorksSectionProps {
  items: PortfolioItem[];
}

export function WorksSection({ items }: WorksSectionProps) {
  const { t, locale, isRTL } = useTranslation();
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [selectedVideo, setSelectedVideo] =
    React.useState<PortfolioItem | null>(null);

  const categories = [
    { id: "all", label: t("portfolio.categories.all") },
    { id: "commercials", label: t("portfolio.categories.commercials") },
    { id: "aerial", label: t("portfolio.categories.aerial") },
    { id: "documentaries", label: t("portfolio.categories.documentaries") },
  ];

  const filteredItems = React.useMemo(() => {
    if (activeCategory === "all") return items.slice(0, 4);
    return items
      .filter(
        (item) =>
          item.category?.slug === activeCategory ||
          item.category_id === activeCategory,
      )
      .slice(0, 4);
  }, [items, activeCategory]);

  return (
    <section
      id="portfolio"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("portfolio.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("portfolio.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              {isRTL
                ? t("portfolio.showcaseTitleAr")
                : t("portfolio.showcaseTitleEn")}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
              {isRTL
                ? t("portfolio.showcaseSubtitleAr")
                : t("portfolio.showcaseSubtitleEn")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? "bg-[#014842] text-white border border-[#09937F]/50 shadow-md"
                    : "bg-white/5 text-[#9EADA9] hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedVideo(item)}
              className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 overflow-hidden cursor-pointer shadow-2xl aspect-[16/10]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ backgroundImage: `url('${item.thumbnail_url}')` }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full bg-[#014842]/90 backdrop-blur-md border border-[#09937F] flex items-center justify-center text-white shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                  <Play className="w-6 h-6 fill-current ms-1 text-[#5EEAD4]" />
                </div>
              </div>

              <div className="absolute top-5 end-5 z-10">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md text-[#5EEAD4] border border-white/10">
                  {item.aspect_ratio || "16:9"}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-2 z-10">
                <div className="flex items-center justify-between text-xs text-[#09937F] font-mono tracking-widest uppercase">
                  <span>{item.client_name}</span>
                  <span>{item.year}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#5EEAD4] transition-colors leading-tight">
                  {isRTL ? item.title_ar : item.title_en}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            href={`/${locale}/works`}
            className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] py-3 ps-6 pe-3 text-xs sm:text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-xl"
          >
            <span>{t("portfolio.viewFullArchive")}</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 group-hover:bg-black group-hover:text-white transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>

      {selectedVideo && (
        <CinemaLightbox
          item={selectedVideo}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </section>
  );
}
