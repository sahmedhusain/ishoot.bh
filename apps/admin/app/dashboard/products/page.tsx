import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { listProductCategories, listProducts, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { ProductsListView } from "../../../components/products/ProductsListView";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("products", "read");
  await requireFeatureEnabled("products");
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), category: text("category"), status: text("status") };
  const [result, categories, company, canCreate, canEdit] = await Promise.all([
    listProducts({ search: filters.q, categoryId: filters.category, status: filters.status, page: Number(text("page")) || 1 }),
    listProductCategories(),
    getCachedCompanySettings(),
    hasPermission("products", "create"),
    hasPermission("products", "edit"),
  ]);
  return <ProductsListView {...result} filters={filters} categories={categories} currency={company.default_currency} canCreate={canCreate} canEdit={canEdit} />;
}
