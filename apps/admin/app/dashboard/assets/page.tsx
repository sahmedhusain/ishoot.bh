import { listAssetCategories, listAssets, ASSET_SORTS } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { AssetsListView } from "../../../components/assets/AssetsListView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("assets");

export const dynamic = "force-dynamic";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("assets", "read");
  const query = await searchParams;
  const value = (key: string) => (typeof query[key] === "string" ? (query[key] as string).slice(0, 150) : "");
  const filters = {
    q: value("q"),
    category: value("category") || "all",
    status: value("status") || "all",
    condition: value("condition") || "all",
    holder: value("holder") || "all",
    sort: (ASSET_SORTS as readonly string[]).includes(value("sort")) ? value("sort") : "tag",
  };
  const [result, categories, rawEmployees, canCreate, canEdit] = await Promise.all([
    listAssets(filters),
    listAssetCategories(false),
    listEmployees().catch(() => []),
    hasPermission("assets", "create"),
    hasPermission("assets", "edit"),
  ]);
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    name_en: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
    name_ar: `${e.first_name_ar || e.first_name_en || ""} ${e.last_name_ar || e.last_name_en || ""}`.trim() || e.id,
  }));
  return (
    <AssetsListView
      items={result.items}
      counts={result.counts}
      totalValue={result.totalValue}
      filters={filters}
      categories={categories.map((c) => ({ id: c.id, name_en: c.name_en, name_ar: c.name_ar }))}
      employees={employees}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  );
}
