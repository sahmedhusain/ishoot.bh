"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import type { PortfolioItem } from "@ishoot/database";
import { ArrowUpRight, Play } from "lucide-react";
import { CinemaLightbox } from "./CinemaLightbox";
import { motion, AnimatePresence } from "framer-motion";

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
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          whileInView={{ opacity: 1, width: "100%" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative w-full"
        >
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4 flex items-center justify-between text-xs uppercase tracking-wider text-[#9EADA9] font-sans"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("portfolio.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("portfolio.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </motion.div>
        </motion.div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-xl space-y-3"
          >
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              {isRTL
                ? t("portfolio.showcaseTitleAr")
                : t("portfolio.showcaseTitleEn")}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed font-sans">
              {isRTL
                ? t("portfolio.showcaseSubtitleAr")
                : t("portfolio.showcaseSubtitleEn")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center gap-2 font-sans"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-[#014842] text-white border border-[#09937F] shadow-md"
                    : "bg-white/5 text-[#9EADA9] hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                &lt;&lt; {cat.label} &gt;&gt;
              </button>
            ))}
          </motion.div>
        </div>

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setSelectedVideo(item)}
                className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 overflow-hidden cursor-pointer shadow-2xl aspect-[16/10]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url('${item.thumbnail_url}')` }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

                <div className="absolute top-5 start-5 z-10">
                  <span className="text-xs font-bold text-[#5EEAD4] font-sans">
                    &lt;&lt; PLAY 4K REEL &gt;&gt;
                  </span>
                </div>

                <div className="absolute top-5 end-5 z-10">
                  <span className="text-[10px] font-bold text-[#9EADA9] font-sans">
                    &lt;&lt; {item.aspect_ratio || "16:9"} &gt;&gt;
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-2 z-20">
                  <div className="flex items-center justify-between text-xs text-[#09937F] font-bold tracking-widest uppercase font-sans">
                    <span>{item.client_name}</span>
                    <span>{item.year}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#5EEAD4] transition-colors leading-tight font-display">
                    {isRTL ? item.title_ar : item.title_en}
                  </h3>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center pt-4"
        >
          <Link
            href={`/${locale}/works`}
            className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] py-3 ps-6 pe-3 text-xs sm:text-sm font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-xl font-sans"
          >
            <span>{t("portfolio.viewFullArchive")}</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 group-hover:bg-black group-hover:text-white transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </Link>
        </motion.div>
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
