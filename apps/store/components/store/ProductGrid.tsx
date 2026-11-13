"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@platform/ui";
import { catalogueQuery, searchCatalogue } from "@platform/database/constants/catalogue-search";
import { defaultWebsiteCommerce } from "@platform/database/constants/website-commerce";
import type { PortfolioItem, PortfolioCategory } from "@platform/database";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { useSiteReducedMotion } from "../site/SiteTheme";
import { field, secondaryButton } from "../account/ui";
import { CategoryTabs } from "../catalog/CategoryTabs";
import { ProductCard } from "../catalog/ProductCard";
import { STORE_SPRING_GRID } from "../../lib/theme";

export interface ProductGridProps {
  items: PortfolioItem[];
  categories: PortfolioCategory[];
  initialCategory?: string;
}

export function ProductGrid({
  items,
  categories,
  initialCategory,
}: ProductGridProps) {
  const reduced = useSiteReducedMotion();
  const { locale, site, t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const config = site?.commerce ?? defaultWebsiteCommerce();
  const query = catalogueQuery(params, config.facetLabels);
  const categorySlug =
    initialCategory ?? (config.categories ? query.category : "all");
  const activeQuery = {
    ...query,
    q: config.search ? query.q : "",
    category: categorySlug,
    sort: config.sorting ? query.sort : "featured",
  };
  const [search, setSearch] = React.useState(query.q);
  React.useEffect(() => setSearch(query.q), [query.q]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (
        value &&
        !(key === "category" && value === "all") &&
        !(key === "sort" && value === "featured")
      )
        next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };

  const result = searchCatalogue(
    items,
    activeQuery,
    locale,
    config.pageSize,
    config.categoryParents,
  );
  const filteredItems = result.items;
  const ar = locale === "ar";

  return (
    <div className="space-y-10" data-testid="product-grid">
      <div className="flex flex-wrap items-end gap-4">
        {config.search && (
          <form
            className="flex flex-1 min-w-[min(100%,16rem)] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: search.trim() });
            }}
          >
            <input
              type="search"
              aria-label={t("store.searchCatalogue")}
              placeholder={t("store.searchPlaceholder")}
              maxLength={160}
              className={field}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className={secondaryButton}>
              {t("shared.common.search")}
            </button>
          </form>
        )}
        {config.sorting && (
          <label className="text-sm space-y-1">
            <span className="block text-ink-muted">{t("store.sortBy")}</span>
            <Select
              className={`${field} min-w-[12rem]`}
              value={activeQuery.sort}
              onChange={(e) => update({ sort: e.target.value })}
            >
              <option value="featured">{t("store.sortFeatured")}</option>
              <option value="name">{t("store.sortName")}</option>
              <option value="newest">{t("store.sortNewest")}</option>
              {items.some((item) => item.price != null) && (
                <>
                  <option value="price-asc">{t("store.sortPriceAsc")}</option>
                  <option value="price-desc">{t("store.sortPriceDesc")}</option>
                </>
              )}
            </Select>
          </label>
        )}
      </div>

      {!!config.facetLabels?.length && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {config.facetLabels.map((facetLabel) => {
            const facts = items
              .flatMap((item) => item.attributes)
              .filter(
                (fact) => (fact.labelEn || fact.labelAr) === facetLabel,
              );
            const options = Array.from(
              new Map(
                facts.map((fact) => [
                  fact.valueEn || fact.valueAr,
                  ar
                    ? fact.valueAr || fact.valueEn
                    : fact.valueEn || fact.valueAr,
                ]),
              ).entries(),
            ).filter(([value]) => value);
            if (!options.length) return null;
            return (
              <label key={facetLabel} className="text-sm space-y-1">
                <span className="text-ink-muted">
                  {ar ? facts[0].labelAr || facetLabel : facetLabel}
                </span>
                <Select
                  className={`${field} min-w-[11rem]`}
                  value={params.get(`filter-${facetLabel}`) ?? ""}
                  onChange={(e) =>
                    update({ [`filter-${facetLabel}`]: e.target.value })
                  }
                >
                  <option value="">{t("shared.common.all")}</option>
                  {options.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </Select>
              </label>
            );
          })}
        </div>
      )}

      {config.categories && !initialCategory && (
        <CategoryTabs
          categories={categories}
          parents={config.categoryParents}
          activeCategory={activeQuery.category}
          onSelect={(slug) => update({ category: slug })}
        />
      )}

      <p role="status" className="text-sm text-ink-muted">
        {t("store.resultsCount", { count: result.total })}
      </p>

      {!result.total && (
        <div className="py-12 space-y-4">
          <p className="text-lg">{t("store.noResults")}</p>
          <button
            type="button"
            className={secondaryButton}
            onClick={() =>
              update({
                q: "",
                category: "all",
                sort: "featured",
                ...Object.fromEntries(
                  (config.facetLabels ?? []).map((facetLabel) => [
                    `filter-${facetLabel}`,
                    "",
                  ]),
                ),
              })
            }
          >
            {t("store.clearFilters")}
          </button>
        </div>
      )}

      <motion.div
        layout={!reduced}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduced}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={reduced ? { duration: 0 } : STORE_SPRING_GRID}
            >
              <ProductCard item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {result.pages > 1 && (
        <nav
          aria-label={t("store.resultPages")}
          className="flex items-center justify-between gap-3"
        >
          <button
            type="button"
            className={secondaryButton}
            disabled={result.page <= 1}
            onClick={() => update({ page: String(result.page - 1) })}
          >
            {t("store.previous")}
          </button>
          <span className="text-sm text-ink-muted">
            <bdi dir="ltr">
              {result.page} / {result.pages}
            </bdi>
          </span>
          <button
            type="button"
            className={secondaryButton}
            disabled={result.page >= result.pages}
            onClick={() => update({ page: String(result.page + 1) })}
          >
            {t("store.next")}
          </button>
        </nav>
      )}
    </div>
  );
}
