import { db, listAssetCategories, listAssets, ASSET_SORTS } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { AssetsListView } from "../../../components/assets/AssetsListView";

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
  const [result, categories, employees, canCreate, canEdit] = await Promise.all([
    listAssets(filters),
    listAssetCategories(false),
    db.employee.findMany({ where: { status: { not: "terminated" } }, select: { id: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true }, orderBy: { firstNameEn: "asc" } }),
    hasPermission("assets", "create"),
    hasPermission("assets", "edit"),
  ]);
  return (
    <AssetsListView
      items={result.items}
      counts={result.counts}
      totalValue={result.totalValue}
      filters={filters}
      categories={categories.map((c) => ({ id: c.id, name_en: c.name_en, name_ar: c.name_ar }))}
      employees={employees.map((e) => ({ id: e.id, name_en: `${e.firstNameEn} ${e.lastNameEn}`, name_ar: `${e.firstNameAr} ${e.lastNameAr}` }))}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  );
}
