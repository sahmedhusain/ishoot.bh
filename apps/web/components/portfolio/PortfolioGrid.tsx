"use client";
import { Select } from "@platform/ui";
import { useSiteReducedMotion } from "../site/SiteTheme";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { catalogueQuery, searchCatalogue } from "@platform/database/constants/catalogue-search";
import { defaultWebsiteCommerce } from "@platform/database/constants/website-commerce";
import { useTranslation } from "../../hooks/useTranslation";
import { field, secondaryButton } from "../account/ui";
import { PortfolioItem, PortfolioCategory } from "@platform/database";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryTabs } from "./CategoryTabs";
import { CollectionCard } from "./CollectionCard";
import { collectionGridClass } from "../../lib/site-copy";
import type { CollectionLayout } from "@platform/database/website-presets";
import { ShowcaseLightbox } from "./ShowcaseLightbox";

interface PortfolioGridProps {
  items: PortfolioItem[];
  categories: PortfolioCategory[];
  layout: CollectionLayout;
}

export function PortfolioGrid({ items, categories, layout }: PortfolioGridProps) {
  const reduced = useSiteReducedMotion();
  const { locale, site, t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const config = site?.commerce ?? defaultWebsiteCommerce();
  const query = catalogueQuery(params, config.facetLabels);
  const activeQuery = { ...query, q: config.search ? query.q : "", category: config.categories ? query.category : "all", sort: config.sorting ? query.sort : "featured" };
  const [search, setSearch] = React.useState(query.q);
  React.useEffect(() => setSearch(query.q), [query.q]);
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(patch)) { if (value && !(key === "category" && value === "all") && !(key === "sort" && value === "featured")) next.set(key, value); else next.delete(key); }
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const result = searchCatalogue(items, activeQuery, locale, config.pageSize, config.categoryParents);
  const filteredItems = result.items;
  const ar = locale === "ar";
  const [selectedItem, setSelectedItem] = React.useState<PortfolioItem | null>(
    null,
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end gap-4">
        {config.search && <form className="flex flex-1 min-w-[min(100%,16rem)] gap-2" onSubmit={e => { e.preventDefault(); update({ q: search.trim() }); }}><input type="search" aria-label={t("portfolio.searchCatalogue")} placeholder={t("portfolio.searchPlaceholder")} maxLength={160} className={field} value={search} onChange={e => setSearch(e.target.value)} /><button type="submit" className={secondaryButton}>{t("portfolio.search")}</button></form>}
        {config.sorting && <label className="text-sm space-y-1"><span className="block text-ink-muted">{t("portfolio.sortBy")}</span><Select className={`${field} min-w-[11rem]`} value={activeQuery.sort} onChange={e => update({ sort: e.target.value })}><option value="featured">{t("portfolio.sortFeatured")}</option><option value="name">{t("portfolio.sortName")}</option><option value="newest">{t("portfolio.sortNewest")}</option>{items.some(item => item.price != null) && <><option value="price-asc">{t("portfolio.sortPriceAsc")}</option><option value="price-desc">{t("portfolio.sortPriceDesc")}</option></>}</Select></label>}
      </div>
      {!!config.facetLabels?.length && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{config.facetLabels.map(label => {
        const facts = items.flatMap(item => item.attributes).filter(fact => (fact.labelEn || fact.labelAr) === label);
        const options = Array.from(new Map(facts.map(fact => [fact.valueEn || fact.valueAr, ar ? fact.valueAr || fact.valueEn : fact.valueEn || fact.valueAr])).entries()).filter(([value]) => value);
        if (!options.length) return null;
        return <label key={label} className="text-sm space-y-1"><span className="text-ink-muted">{ar ? facts[0].labelAr || label : label}</span><Select className={`${field} min-w-[11rem]`} value={params.get(`filter-${label}`) ?? ""} onChange={e => update({ [`filter-${label}`]: e.target.value })}><option value="">{t("portfolio.all")}</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</Select></label>;
      })}</div>}
      {config.categories && <CategoryTabs
        categories={categories}
        parents={config.categoryParents}
        activeCategory={activeQuery.category}
        onSelect={(slug) => update({ category: slug })}
      />}
      <p role="status" className="text-sm text-ink-muted">{t("portfolio.resultsCount", { count: result.total })}</p>
      {!result.total && <div className="py-12 space-y-4"><p className="text-lg">{t("portfolio.noResults")}</p><button type="button" className={secondaryButton} onClick={() => update({ q: "", category: "all", sort: "featured", ...Object.fromEntries((config.facetLabels ?? []).map(label => [`filter-${label}`, ""])) })}>{t("portfolio.clearFilters")}</button></div>}
      <motion.div
        layout={!reduced}
        className={collectionGridClass(layout)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduced}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <CollectionCard item={item} layout={layout} onOpen={setSelectedItem} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {result.pages > 1 && <nav aria-label={t("portfolio.resultPages")} className="flex items-center justify-between gap-3"><button type="button" className={secondaryButton} disabled={result.page <= 1} onClick={() => update({ page: String(result.page - 1) })}>{t("portfolio.previous")}</button><span className="text-sm text-ink-muted">{result.page} / {result.pages}</span><button type="button" className={secondaryButton} disabled={result.page >= result.pages} onClick={() => update({ page: String(result.page + 1) })}>{t("portfolio.next")}</button></nav>}
      <ShowcaseLightbox
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
