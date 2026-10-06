"use client";
import {ContentImage} from "../shared/ContentImage";

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
    <section
      id="portfolio"
      className="relative z-30 py-20 sm:py-28 bg-[#F8FAFC] text-[#0F172A] border-t border-slate-200 overflow-hidden"
    >
      <div className="shell relative z-10 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
            className="space-y-3"
          >
            <SectionBadge className="!text-[#075e4c]">
              {t("portfolio.badge")}
            </SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-slate-950 leading-tight">
              {t("portfolio.title")}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-sans max-w-xl leading-relaxed">
              {t("portfolio.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: reduced ? 0 : 0.45,
              ease: [0.2, 0, 0, 1],
              delay: 0,
            }}
          >
            <Link
              className="inline-flex min-h-11 gap-2 items-center px-5 py-2.5 rounded-md bg-white hover:bg-slate-100 text-[#075e4c] border border-slate-300 text-sm font-semibold transition-colors duration-150"
              href={`/${locale}/works`}
            >
              <span>{t("portfolio.filterAll")}</span>
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {[
            {
              id: "all",
              nameEn: t("portfolio.filterAll"),
              nameAr: t("portfolio.filterAll"),
            },
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
                className={`min-h-11 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--web-accent)] text-white border border-[var(--web-accent)]"
                    : "bg-white text-slate-600 hover:text-slate-950 border border-slate-300 hover:border-slate-400"
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
                duration: reduced ? 0 : 0.45,
                ease: [0.2, 0, 0, 1],
                delay: reduced ? 0 : Math.min(index * 0.08, 0.2),
              }}
              className="group overflow-hidden"
            >
              <button
                onClick={() => setSelected(item)}
                className="block w-full text-start cursor-pointer"
                aria-label={`${t("portfolio.viewProject")}: ${ar ? item.title_ar : item.title_en}`}
              >
                <div className="relative overflow-hidden rounded-md aspect-[16/10] bg-[#050807]">
                  <ContentImage
                    loading="lazy"
                    width={800}
                    height={500}
                    src={item.thumbnail_url}
                    alt={ar ? item.title_ar : item.title_en}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.025]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  <span className="absolute bottom-4 end-4 w-11 h-11 rounded-full bg-[var(--web-accent)] hover:bg-[#5EEAD4] text-white hover:text-black flex items-center justify-center transition-colors duration-150 ">
                    {item.full_video_url || item.preview_video_url ? (
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg sm:text-2xl font-bold font-display text-slate-950 group-hover:text-[#075e4c] transition-colors">
                      {ar ? item.title_ar : item.title_en}
                    </h3>
                    <span className="text-xs font-medium text-slate-600 font-sans shrink-0">
                      {item.year}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-sans">
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
