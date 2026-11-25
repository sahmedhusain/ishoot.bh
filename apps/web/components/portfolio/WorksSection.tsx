"use client";

import { useSiteReducedMotion } from "../site/SiteTheme";
import * as React from "react";
import { categoryAncestors } from "@platform/database/constants/website-commerce";
import type { PortfolioCategory, PortfolioItem } from "@platform/database/types";
import Link from "next/link";
import type { CollectionLayout } from "@platform/database/website-presets";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { ShowcaseLightbox } from "./ShowcaseLightbox";
import { CollectionCard } from "./CollectionCard";
import { collectionHref, collectionGridClass } from "../../lib/site-copy";

export function WorksSection({
  items,
  categories: categoryChoices,
  title,
  presentation,
  filterable = true,
  limit,
  list = false,
}: {
  items: PortfolioItem[];
  categories?: PortfolioCategory[];
  title?: string;
  presentation?: CollectionLayout;
  filterable?: boolean;
  limit?: number;
  list?: boolean;
}) {
  const { t, locale, isArabic: ar, site } = useTranslation();
  const layout = presentation ?? site?.collection.layout ?? "media";
  const reduced = useSiteReducedMotion();
  const [category, setCategory] = React.useState("all");
  const [selected, setSelected] = React.useState<PortfolioItem | null>(null);

  const categories =
    categoryChoices ??
    Array.from(
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
    .filter(
      (item) =>
        !filterable ||
        category === "all" ||
        categoryAncestors(
          item.category?.slug ?? "",
          site?.commerce?.categoryParents,
        ).includes(categories.find((choice) => choice.id === category)?.slug ?? ""),
    )
    .slice(0, limit ?? (layout === "product" || layout === "listing" ? 6 : 4));

  if (!items.length) return null;

  return (
    <section
      id="portfolio"
      className="relative z-30 py-20 sm:py-28 bg-m3-surface text-m3-on-surface border-t border-m3-outline-variant overflow-hidden"
    >
      <div className="shell relative z-10 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-m3-outline-variant">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
            className="space-y-3"
          >
            <SectionBadge>{t("portfolio.badge")}</SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-m3-on-surface leading-tight">
              {title || t("portfolio.title")}
            </h2>
            <p className="text-sm sm:text-base text-m3-on-surface-variant font-sans max-w-xl leading-relaxed">
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
              className="inline-flex min-h-11 gap-2 items-center px-5 py-2.5 rounded-full bg-transparent hover:bg-m3-primary/[0.08] text-m3-primary border border-m3-outline text-sm font-semibold transition-colors duration-150"
              href={site ? collectionHref(site, locale) : `/${locale}`}
            >
              <span>{t("portfolio.filterAll")}</span>
              <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </motion.div>
        </div>

        {filterable && (
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
                  className={`min-h-11 px-4 py-2 rounded-[var(--md-sys-shape-corner-small,8px)] text-xs sm:text-sm font-semibold border transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-m3-secondary-container text-m3-on-secondary-container border-transparent"
                      : "bg-transparent text-m3-on-surface-variant border-m3-outline hover:bg-m3-on-surface/[0.08] hover:text-m3-on-surface"
                  }`}
                >
                  {ar ? c.nameAr : c.nameEn}
                </button>
              );
            })}
          </div>
        )}

        <div className={list ? "grid gap-6" : collectionGridClass(layout)}>
          {shown.map((item, index) => (
            <motion.div
              key={item.id}
              className="work-row"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: reduced ? 0 : 0.45,
                ease: [0.2, 0, 0, 1],
                delay: reduced ? 0 : Math.min(index * 0.08, 0.2),
              }}
            >
              <CollectionCard horizontal={list} item={item} layout={layout} onOpen={setSelected} />
            </motion.div>
          ))}
        </div>

        <ShowcaseLightbox item={selected} onClose={() => setSelected(null)} />
      </div>
    </section>
  );
}
