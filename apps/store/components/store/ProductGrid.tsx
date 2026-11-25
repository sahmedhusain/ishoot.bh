"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Scale, ShoppingBag, X } from "lucide-react";
import { Select } from "@platform/ui";
import { catalogueQuery, searchCatalogue } from "@platform/database/constants/catalogue-search";
import { defaultWebsiteCommerce } from "@platform/database/constants/website-commerce";
import { pickText } from "@platform/database/constants/languages";
import { calculatePointsEarned } from "@platform/database/constants/store";
import type { PortfolioItem, PortfolioCategory } from "@platform/database";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { useSiteReducedMotion } from "../site/SiteTheme";
import { formatPrice } from "../../lib/site-copy";
import { field, secondaryButton } from "../account/ui";
import { CategoryTabs } from "../catalog/CategoryTabs";
import { ProductCard } from "../catalog/ProductCard";
import { ContentImage } from "../shared/ContentImage";
import { addToCart } from "./cart";
import { useStorePreferences } from "../layout/StorePreferencesBar";
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
  const { locale, site, t, isRTL } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { region, convertFromBase } = useStorePreferences();
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
  const [minPrice, setMinPrice] = React.useState(query.minPrice != null ? String(query.minPrice) : "");
  const [maxPrice, setMaxPrice] = React.useState(query.maxPrice != null ? String(query.maxPrice) : "");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [quickViewItem, setQuickViewItem] = React.useState<PortfolioItem | null>(null);
  const [compareItems, setCompareItems] = React.useState<PortfolioItem[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);

  React.useEffect(() => setSearch(query.q), [query.q]);

  const brands = React.useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.brand?.trim()).filter((b): b is string => Boolean(b))),
      ).sort(),
    [items],
  );

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
  const hasActiveFilters = Boolean(
    activeQuery.q ||
      (activeQuery.category && activeQuery.category !== "all") ||
      (activeQuery.sort && activeQuery.sort !== "featured") ||
      activeQuery.brand ||
      activeQuery.minPrice != null ||
      activeQuery.maxPrice != null ||
      activeQuery.inStock ||
      activeQuery.onSale ||
      (config.facetLabels ?? []).some((label) => Boolean(params.get(`filter-${label}`))),
  );
  const clearAllFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    update({
      q: "",
      category: "all",
      sort: "featured",
      brand: "",
      minPrice: "",
      maxPrice: "",
      inStock: "",
      onSale: "",
      ...Object.fromEntries(
        (config.facetLabels ?? []).map((facetLabel) => [
          `filter-${facetLabel}`,
          "",
        ]),
      ),
    });
  };

  const toggleCompare = (item: PortfolioItem) => {
    setCompareItems((prev) => {
      if (prev.some((x) => x.id === item.id)) {
        return prev.filter((x) => x.id !== item.id);
      }
      if (prev.length >= 4) return [...prev.slice(1), item];
      return [...prev, item];
    });
  };

  const baseCurrency = site?.currency || "BHD";
  const displayCurrency = region?.currency || baseCurrency;
  const displayPrice = (amount?: number | null) => {
    if (amount == null || !site) return "";
    const val = displayCurrency !== baseCurrency ? convertFromBase(amount) : amount;
    return formatPrice(val, displayCurrency, locale);
  };

  return (
    <div className="space-y-8" data-testid="product-grid">
      <div className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant/60 p-4 sm:p-5 space-y-4">
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
                <option value="name-desc">{t("store.sortNameDesc", { defaultValue: "Name: Z-A" })}</option>
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

          <div className="flex items-center gap-1 rounded-full border border-m3-outline-variant bg-m3-surface p-1">
            <button
              type="button"
              aria-label={t("store.gridView", { defaultValue: "Grid view" })}
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 rounded-full grid place-items-center transition-colors ${
                viewMode === "grid" ? "bg-m3-primary text-m3-on-primary" : "text-ink-muted hover:text-ink"
              }`}
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t("store.listView", { defaultValue: "List view" })}
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 rounded-full grid place-items-center transition-colors ${
                viewMode === "list" ? "bg-m3-primary text-m3-on-primary" : "text-ink-muted hover:text-ink"
              }`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Advanced Store Filters: Brand, Price Range, In-Stock, On-Sale */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {brands.length > 0 && (
            <Select
              aria-label={t("store.filterBrand", { defaultValue: "Brand" })}
              className={`${field} max-w-[11rem]`}
              value={activeQuery.brand ?? ""}
              onChange={(e) => update({ brand: e.target.value })}
            >
              <option value="">{t("store.allBrands", { defaultValue: "All Brands" })}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          )}
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              update({ minPrice: minPrice.trim(), maxPrice: maxPrice.trim() });
            }}
          >
            <input
              type="number"
              min={0}
              step="any"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={t("store.minPrice", { defaultValue: "Min" })}
              aria-label={t("store.minPrice", { defaultValue: "Min price" })}
              className={`${field} w-20`}
            />
            <span className="text-xs text-ink-muted">-</span>
            <input
              type="number"
              min={0}
              step="any"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t("store.maxPrice", { defaultValue: "Max" })}
              aria-label={t("store.maxPrice", { defaultValue: "Max price" })}
              className={`${field} w-20`}
            />
            <button type="submit" className={secondaryButton}>
              {t("store.applyPriceFilter", { defaultValue: "Filter" })}
            </button>
          </form>

          <button
            type="button"
            onClick={() => update({ inStock: activeQuery.inStock ? "" : "1" })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeQuery.inStock
                ? "border-m3-primary bg-m3-primary/10 text-m3-primary"
                : "border-m3-outline-variant bg-m3-surface text-ink-muted hover:text-ink"
            }`}
          >
            {t("store.inStockOnly", { defaultValue: "In Stock Only" })}
          </button>

          <button
            type="button"
            onClick={() => update({ onSale: activeQuery.onSale ? "" : "1" })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeQuery.onSale
                ? "border-m3-error bg-m3-error/10 text-m3-error"
                : "border-m3-outline-variant bg-m3-surface text-ink-muted hover:text-ink"
            }`}
          >
            {t("store.onSaleOnly", { defaultValue: "On Sale" })}
          </button>
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-m3-outline-variant/40">
          <p role="status" data-testid="product-results-count" className="text-sm font-medium text-ink-muted">
            {t("store.resultsCount", { count: result.total })}
          </p>
          <div className="flex items-center gap-2">
            {compareItems.length > 0 && (
              <button
                type="button"
                data-testid="open-compare-drawer"
                onClick={() => setCompareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3 py-1.5 text-xs font-semibold text-m3-on-primary"
              >
                <Scale className="w-3.5 h-3.5" aria-hidden="true" />
                {t("store.compareCount", { count: compareItems.length, defaultValue: `Compare (${compareItems.length})` })}
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className={secondaryButton}
                onClick={clearAllFilters}
              >
                {t("store.clearFilters")}
              </button>
            )}
          </div>
        </div>
      </div>

      {!result.total && (
        <div className="py-12 space-y-4">
          <p className="text-lg">{t("store.noResults")}</p>
          <button
            type="button"
            className={secondaryButton}
            onClick={clearAllFilters}
          >
            {t("store.clearFilters")}
          </button>
        </div>
      )}

      <motion.div
        layout={!reduced}
        className={
          viewMode === "list"
            ? "grid grid-cols-1 gap-4 stagger-children"
            : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children"
        }
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
              <ProductCard
                item={item}
                horizontal={viewMode === "list"}
                onQuickView={setQuickViewItem}
                onCompareToggle={toggleCompare}
                compared={compareItems.some((c) => c.id === item.id)}
              />
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

      {quickViewItem && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="quick-view-modal"
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickViewItem(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6 shadow-2xl grid sm:grid-cols-[0.9fr_1.1fr] gap-6 text-ink">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-m3-surface">
              <ContentImage
                src={quickViewItem.thumbnail_url}
                alt={pickText(quickViewItem.title_en, quickViewItem.title_ar, locale)}
                width={500}
                height={500}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl font-bold">
                    {pickText(quickViewItem.title_en, quickViewItem.title_ar, locale)}
                  </h2>
                  <button
                    type="button"
                    aria-label={t("footer.close", { defaultValue: "Close" })}
                    onClick={() => setQuickViewItem(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-surface-container-high shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {quickViewItem.sku && (
                  <p className="text-xs font-mono text-ink-muted">SKU: {quickViewItem.sku}</p>
                )}
                <p className="text-lg font-bold text-m3-primary">
                  {displayPrice(quickViewItem.price) || t("store.contactForPrice")}
                </p>
                {quickViewItem.price != null && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    +{calculatePointsEarned(quickViewItem.price)} {t("store.pointsShort", { defaultValue: "pts" })}
                  </p>
                )}
                <p className="text-sm text-ink-muted line-clamp-3">
                  {pickText(quickViewItem.description_en, quickViewItem.description_ar, locale)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    addToCart({ productId: quickViewItem.id, quantity: 1 });
                    setQuickViewItem(null);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-m3-primary text-m3-on-primary px-4 py-2.5 text-xs font-bold"
                >
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  {t("store.addToCart")}
                </button>
                <Link
                  href={`/${locale}/products/${quickViewItem.slug}`}
                  onClick={() => setQuickViewItem(null)}
                  className={secondaryButton}
                >
                  {t("store.viewDetails", { defaultValue: "Details" })}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {compareOpen && compareItems.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="compare-modal"
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompareOpen(false);
          }}
        >
          <div className="w-full max-w-4xl max-h-[85dvh] overflow-y-auto rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6 shadow-2xl space-y-4 text-ink">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-m3-primary" aria-hidden="true" />
                {t("store.compareProducts", { defaultValue: "Compare Products" })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompareItems([]);
                    setCompareOpen(false);
                  }}
                  className={secondaryButton}
                >
                  {t("store.clearFilters")}
                </button>
                <button
                  type="button"
                  aria-label={t("footer.close", { defaultValue: "Close" })}
                  onClick={() => setCompareOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-surface-container-high"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-m3-outline-variant">
                    <th className="p-2 text-start font-semibold text-ink-muted">{t("store.specification", { defaultValue: "Spec" })}</th>
                    {compareItems.map((item) => (
                      <th key={item.id} className="p-2 text-start font-bold">
                        {pickText(item.title_en, item.title_ar, locale)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-m3-outline-variant/50">
                    <td className="p-2 text-ink-muted">{t("store.priceLabel", { defaultValue: "Price" })}</td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-2 font-semibold">
                        {displayPrice(item.price) || t("store.contactForPrice")}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-m3-outline-variant/50">
                    <td className="p-2 text-ink-muted">{t("store.filterBrand", { defaultValue: "Brand" })}</td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-2">{item.brand || "—"}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-m3-outline-variant/50">
                    <td className="p-2 text-ink-muted">SKU</td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-2 font-mono">{item.sku || "—"}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 text-ink-muted">{t("store.stockStatus", { defaultValue: "Stock" })}</td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-2">
                        {item.track_stock && item.available_stock != null && item.available_stock <= 0
                          ? t("store.outOfStock")
                          : t("store.inStock")}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
