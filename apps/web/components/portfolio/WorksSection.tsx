"use client";

import * as React from "react";
import Link from "next/link";
import type { PortfolioItem } from "@ishoot/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ArrowUpRight, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { CinemaLightbox } from "./CinemaLightbox";

export function WorksSection({ items }: { items: PortfolioItem[] }) {
  const { t, locale, isRTL: ar } = useTranslation();
  const reduced = useReducedMotion();
  const [category, setCategory] = React.useState("all");
  const [selected, setSelected] = React.useState<PortfolioItem | null>(null);

  const categories = Array.from(
    new Map(
      items.filter((i) => i.category).map((i) => [i.category!.id, i.category!]),
    ).values(),
  );

  const featured = [...items].sort(
    (a, b) =>
      Number(b.is_featured) - Number(a.is_featured) ||
      a.display_order - b.display_order,
  );

  const shown = featured
    .filter((item) => category === "all" || item.category_id === category)
    .slice(0, 4);

  if (!items.length) return null;

  return (
    <section id="portfolio" className="relative z-10 py-24 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/10 overflow-hidden">
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="shell relative z-10 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-3"
          >
            <SectionBadge>{t("portfolio.badge") || (ar ? "مختارات من الأعمال" : "Selected Works")}</SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white leading-tight">
              {t("portfolio.title") || (ar ? "أرشيف الإنتاج السينمائي" : "The Archive")}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] font-sans max-w-xl leading-relaxed">
              {t("portfolio.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link
              className="inline-flex gap-2 items-center px-5 py-2.5 rounded-xl bg-[#09937F]/15 hover:bg-[#09937F]/25 text-[#5EEAD4] border border-[#09937F]/40 text-xs sm:text-sm font-semibold transition-all shadow-sm"
              href={`/${locale}/works`}
            >
              <span>{t("portfolio.filterAll") || (ar ? "جميع الأعمال" : "All Projects")}</span>
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {[
            { id: "all", nameEn: t("portfolio.filterAll") || "All Projects", nameAr: t("portfolio.filterAll") || "كل الأعمال" },
            ...categories.map((c) => ({
              id: c.id,
              nameEn: c.name_en,
              nameAr: c.name_ar,
            })),
          ].map((c) => {
            const isSelected = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setCategory(c.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-[#09937F] text-white shadow-lg shadow-[#09937F]/25 border border-[#09937F]"
                    : "bg-[#0B1210] text-[#9EADA9] hover:text-white border border-white/10 hover:border-white/20"
                }`}
              >
                {ar ? c.nameAr : c.nameEn}
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-8 sm:gap-10">
          {shown.map((item, index) => (
            <motion.article
              key={item.id}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: Math.min(index * 0.08, 0.2),
              }}
              className="group rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all p-4 sm:p-5 shadow-xl overflow-hidden"
            >
              <button
                onClick={() => setSelected(item)}
                className="block w-full text-start cursor-pointer"
                aria-label={`${t("portfolio.viewProject") || (ar ? "عرض المشروع" : "View project")}: ${ar ? item.title_ar : item.title_en}`}
              >
                <div className="relative overflow-hidden rounded-2xl aspect-[16/10] bg-[#050807] border border-white/5">
                  <img
                    loading="lazy"
                    width={800}
                    height={500}
                    src={item.thumbnail_url}
                    alt={ar ? item.title_ar : item.title_en}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  <span className="absolute bottom-4 end-4 w-11 h-11 rounded-full bg-[#09937F] hover:bg-[#5EEAD4] text-white hover:text-black flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#09937F]/30 group-hover:scale-110">
                    {item.full_video_url || item.preview_video_url ? (
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg sm:text-2xl font-bold font-display text-white group-hover:text-[#5EEAD4] transition-colors">
                      {ar ? item.title_ar : item.title_en}
                    </h3>
                    <span className="text-xs font-bold text-[#09937F] font-sans shrink-0">
                      &lt;&lt; {item.year} &gt;&gt;
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#9EADA9] font-sans">
                    {item.client_name}
                  </p>
                </div>
              </button>
            </motion.article>
          ))}
        </div>

        <CinemaLightbox item={selected} onClose={() => setSelected(null)} />
      </div>
    </section>
  );
}

