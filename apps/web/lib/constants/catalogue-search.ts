import { categoryAncestors } from "./website-commerce";
import type { PortfolioItem } from "../types";

export interface CatalogueQuery {
  q: string;
  category: string;
  sort: string;
  page: number;
  filters?: { label: string; value: string }[];
}
export function catalogueQuery(
  params: { get: (key: string) => string | null },
  facetLabels: string[] = [],
): CatalogueQuery {
  const page = Number(params.get("page"));
  const sort = params.get("sort") ?? "featured";
  return {
    filters: facetLabels
      .map((label) => ({
        label,
        value: (params.get(`filter-${label}`) ?? "").slice(0, 200),
      }))
      .filter((filter) => filter.value),
    q: (params.get("q") ?? "").trim().slice(0, 160),
    category: (params.get("category") ?? "all").slice(0, 80),
    sort: ["featured", "name", "price-asc", "price-desc", "newest"].includes(
      sort,
    )
      ? sort
      : "featured",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
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
  const filtered = items.filter(
    (item) =>
      (query.filters ?? []).every((filter) =>
        item.attributes.some(
          (fact) =>
            (fact.labelEn || fact.labelAr) === filter.label &&
            (fact.valueEn || fact.valueAr) === filter.value,
        ),
      ) &&
      (query.category === "all" ||
        categoryAncestors(item.category?.slug ?? "", categoryParents).includes(
          query.category,
        )) &&
      (!needle ||
        [
          item.title_en,
          item.title_ar,
          item.subtitle_en,
          item.subtitle_ar,
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
          .includes(needle)),
  );
  const name = (item: PortfolioItem) =>
    locale === "ar"
      ? item.title_ar || item.title_en
      : item.title_en || item.title_ar;
  if (query.sort === "name")
    filtered.sort((a, b) => name(a).localeCompare(name(b), locale));
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
