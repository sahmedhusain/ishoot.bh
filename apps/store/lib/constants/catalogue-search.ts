import { categoryAncestors } from "./website-commerce";
import type { PortfolioItem } from "../types";

export interface CatalogueQuery {
  q: string;
  category: string;
  sort: string;
  page: number;
  filters?: { label: string; value: string }[];
  brand?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  onSale?: boolean;
}
export function catalogueQuery(
  params: { get: (key: string) => string | null },
  facetLabels: string[] = [],
): CatalogueQuery {
  const page = Number(params.get("page"));
  const sort = params.get("sort") ?? "featured";
  const minRaw = params.get("minPrice");
  const maxRaw = params.get("maxPrice");
  const minPrice = minRaw && Number.isFinite(Number(minRaw)) ? Number(minRaw) : null;
  const maxPrice = maxRaw && Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : null;
  return {
    filters: facetLabels
      .map((label) => ({
        label,
        value: (params.get(`filter-${label}`) ?? "").slice(0, 200),
      }))
      .filter((filter) => filter.value),
    q: (params.get("q") ?? "").trim().slice(0, 160),
    category: (params.get("category") ?? "all").slice(0, 80),
    sort: ["featured", "name", "name-desc", "price-asc", "price-desc", "newest"].includes(
      sort,
    )
      ? sort
      : "featured",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    brand: (params.get("brand") ?? "").trim().slice(0, 80),
    minPrice,
    maxPrice,
    inStock: params.get("inStock") === "1",
    onSale: params.get("onSale") === "1",
  };
}
export function searchCatalogue(
  items: PortfolioItem[],
  query: CatalogueQuery,
  locale: string,
  pageSize: number,
  categoryParents: Record<string, string> = {},
) {
  const needle = query.q.normalize("NFKC").toLocaleLowerCase(locale);
  const brandFilter = (query.brand ?? "").trim().toLowerCase();
  const filtered = items.filter((item) => {
    const passesFacets = (query.filters ?? []).every((filter) =>
      item.attributes.some(
        (fact) =>
          (fact.labelEn || fact.labelAr) === filter.label &&
          (fact.valueEn || fact.valueAr) === filter.value,
      ),
    );
    if (!passesFacets) return false;
    if (
      query.category !== "all" &&
      !categoryAncestors(item.category?.slug ?? "", categoryParents).includes(
        query.category,
      )
    ) {
      return false;
    }
    if (brandFilter && (item.brand ?? "").toLowerCase() !== brandFilter) {
      return false;
    }
    if (
      query.inStock &&
      item.track_stock &&
      item.available_stock != null &&
      item.available_stock <= 0
    ) {
      return false;
    }
    if (
      query.onSale &&
      !(item.compare_at_price != null && item.price != null && item.compare_at_price > item.price)
    ) {
      return false;
    }
    if (query.minPrice != null && (item.price == null || item.price < query.minPrice)) {
      return false;
    }
    if (query.maxPrice != null && (item.price == null || item.price > query.maxPrice)) {
      return false;
    }
    if (!needle) return true;
    return [
      item.title_en,
      item.title_ar,
      item.subtitle_en,
      item.subtitle_ar,
      item.brand,
      item.sku,
      item.location,
      ...item.attributes.flatMap((f) => [
        f.labelEn,
        f.labelAr,
        f.valueEn,
        f.valueAr,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .normalize("NFKC")
      .toLocaleLowerCase(locale)
      .includes(needle);
  });
  const name = (item: PortfolioItem) =>
    locale === "ar"
      ? item.title_ar || item.title_en
      : item.title_en || item.title_ar;
  if (query.sort === "name")
    filtered.sort((a, b) => name(a).localeCompare(name(b), locale));
  if (query.sort === "name-desc")
    filtered.sort((a, b) => name(b).localeCompare(name(a), locale));
  if (query.sort === "newest")
    filtered.sort(
      (a, b) =>
        (Date.parse(b.created_at) || Number(b.year) || 0) -
        (Date.parse(a.created_at) || Number(a.year) || 0),
    );
  if (query.sort.startsWith("price-"))
    filtered.sort((a, b) =>
      a.price == null
        ? b.price == null
          ? 0
          : 1
        : b.price == null
          ? -1
          : query.sort === "price-asc"
            ? a.price - b.price
            : b.price - a.price,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(query.page, pages);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    pages,
    page,
  };
}
