"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";
import type { PortfolioItem, PortfolioCategory } from "@platform/database/types";
import type { CollectionLayout } from "@platform/database/website-presets";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionGridClass } from "../../lib/site-copy";
import { formatResultCount } from "../../lib/format-site";
import { CollectionCard } from "./CollectionCard";
import { CategoryTabs } from "./CategoryTabs";

export function PortfolioGrid({
  items,
  categories,
  layout = "media",
  initialQuery = "",
  initialCategory = "all",
  initialSort = "featured",
}: {
  items: PortfolioItem[];
  categories: PortfolioCategory[];
  layout?: CollectionLayout;
  initialQuery?: string;
  initialCategory?: string;
  initialSort?: string;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = React.useState(initialQuery);
  const [activeCategory, setActiveCategory] = React.useState(initialCategory);
  const [sort, setSort] = React.useState(initialSort);

  const pushParams = React.useCallback(
    (nextQ: string, nextCat: string, nextSort: string) => {
      const sp = new URLSearchParams();
      if (nextQ.trim()) sp.set("q", nextQ.trim());
      if (nextCat && nextCat !== "all") sp.set("category", nextCat);
      if (nextSort && nextSort !== "featured") sp.set("sort", nextSort);
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (activeCategory !== "all" && item.category?.slug !== activeCategory) return false;
      if (!q) return true;
      return (
        item.title_en.toLowerCase().includes(q) ||
        item.title_ar.toLowerCase().includes(q) ||
        (item.subtitle_en?.toLowerCase().includes(q) ?? false) ||
        (item.subtitle_ar?.toLowerCase().includes(q) ?? false) ||
        (item.client_name?.toLowerCase().includes(q) ?? false) ||
        (item.category?.name_en?.toLowerCase().includes(q) ?? false)
      );
    });
    if (sort === "name") {
      return [...list].sort((a, b) =>
        (locale === "ar" ? a.title_ar : a.title_en).localeCompare(locale === "ar" ? b.title_ar : b.title_en),
      );
    }
    if (sort === "newest") {
      return [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    }
    if (sort === "price_asc") {
      return [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    }
    if (sort === "price_desc") {
      return [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }
    return list;
  }, [items, activeCategory, query, sort, locale]);

  const clearFilters = () => {
    setQuery("");
    setActiveCategory("all");
    setSort("featured");
    router.push(pathname);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-m3-surface-container-low border border-m3-outline-variant p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              pushParams(query, activeCategory, sort);
            }}
            className="flex flex-1 items-center gap-2"
          >
            <label className="relative flex-1">
              <Search className="w-4 h-4 text-m3-on-surface-variant pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t("portfolio.searchCatalogue")}
                placeholder={t("portfolio.searchPlaceholder")}
                className="w-full h-11 rounded-full bg-m3-surface border border-m3-outline-variant ps-10 pe-4 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 px-5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:bg-m3-primary/90 transition-colors cursor-pointer shrink-0"
            >
              {t("articles.search")}
            </button>
          </form>

          <div className="flex items-center gap-2.5 shrink-0">
            <label htmlFor="portfolio-sort" className="text-xs font-semibold text-m3-on-surface-variant whitespace-nowrap shrink-0">
              {t("portfolio.sortBy")}
            </label>
            <select
              id="portfolio-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                pushParams(query, activeCategory, e.target.value);
              }}
              aria-label={t("portfolio.sortBy")}
              className="h-11 leading-none rounded-full bg-m3-surface border border-m3-outline-variant px-4 py-0 text-xs font-semibold text-m3-on-surface focus:outline-none focus:border-m3-primary shrink-0"
            >
              <option value="featured">{t("portfolio.sortFeatured")}</option>
              <option value="newest">{t("portfolio.sortNewest")}</option>
              <option value="name">{t("portfolio.sortName")}</option>
              <option value="price_asc">{t("portfolio.sortPriceAsc")}</option>
              <option value="price_desc">{t("portfolio.sortPriceDesc")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-m3-outline-variant/60">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelect={(cat) => {
              setActiveCategory(cat);
              pushParams(query, cat, sort);
            }}
          />
          <p className="text-xs font-semibold text-m3-on-surface-variant">
            {formatResultCount(filtered.length, locale, t("portfolio.resultsCount"))}
          </p>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className={collectionGridClass(layout)}>
          {filtered.map((item) => (
            <CollectionCard key={item.id} item={item} layout={layout} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-m3-surface-container-low border border-m3-outline-variant p-10 text-center space-y-4">
          <p className="text-sm sm:text-base text-m3-on-surface-variant">
            {t("portfolio.noResults")}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-11 px-5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("portfolio.clearFilters")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
